import { PrismaService } from '@/core/prisma/prisma.service';
import { Activity, Event, Level } from '@/generated/prisma/client';
import { EventRepository, mapPrismaEventToListItem } from './event.repository';

const anEvent = (
  overrides: Partial<Event> = {},
  participations = 4,
  level: Level | null = { id: 'l1', name: 'Pokročilí', order: 3 },
): Parameters<typeof mapPrismaEventToListItem>[0] =>
  ({
    id: 'e1',
    title: 'Čtvrteční florbal',
    imageUrl: null,
    startAt: new Date('2026-10-22T17:00:00Z'),
    endAt: new Date('2026-10-22T19:00:00Z'),
    venueType: 'PUBLIC_VENUE',
    locationPlaceName: 'ZŠ Kobylisy',
    locationDistrict: 'Praha 8',
    locationCity: 'Praha',
    minParticipants: 8,
    maxParticipants: 10,
    externalOccupiedSpots: 2,
    activity: {
      id: 'a1',
      name: 'Florbal',
      icon: 'florbal',
      defaultMinParticipants: 8,
      defaultMaxParticipants: 12,
    } as Activity,
    level,
    _count: { participations },
    ...overrides,
  }) as Parameters<typeof mapPrismaEventToListItem>[0];

describe('mapPrismaEventToListItem', () => {
  it('counts people brought by the organizer as taken seats', () => {
    expect(mapPrismaEventToListItem(anEvent()).takenCount).toBe(6);
  });

  it('keeps only the approximate place', () => {
    const item = mapPrismaEventToListItem(
      anEvent({ locationStreet: 'Chabařovická 1' } as Partial<Event>),
    );

    expect(item).toMatchObject({
      placeName: 'ZŠ Kobylisy',
      district: 'Praha 8',
      city: 'Praha',
    });
    expect(item).not.toHaveProperty('locationStreet');
    expect(item).not.toHaveProperty('locationLatitude');
  });

  it('does not name a private venue', () => {
    const item = mapPrismaEventToListItem(
      anEvent({ venueType: 'PRIVATE_VENUE' }),
    );

    expect(item.placeName).toBeNull();
    expect(item.district).toBe('Praha 8');
  });

  it('has no level when the organizer did not set one', () => {
    expect(mapPrismaEventToListItem(anEvent({}, 0, null)).level).toBeNull();
  });
});

describe('EventRepository', () => {
  // The conditions themselves are SQL and are covered against a real database
  // in event-list-search.spec.ts; here the repository's own work is checked.
  const setup = (
    pageIds: string[],
    total: number,
    events: Parameters<typeof mapPrismaEventToListItem>[0][] = [],
  ): {
    queryRaw: jest.Mock;
    findMany: jest.Mock;
    repository: EventRepository;
  } => {
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce(pageIds.map((id) => ({ id })))
      .mockResolvedValueOnce([{ total: BigInt(total) }]);
    const findMany = jest.fn().mockResolvedValue(events);
    const prisma = {
      event: { findMany },
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    return { queryRaw, findMany, repository: new EventRepository(prisma) };
  };

  const sqlValues = (call: unknown[]): unknown[] =>
    call.slice(1).flatMap((value) => {
      const nested = (value as { values?: unknown[] } | null)?.values;
      return nested ? sqlValues([null, ...nested]) : [value];
    });

  it('returns the events in the order of the page, with the total of all matches', async () => {
    const { repository } = setup(['e2', 'e1'], 57, [
      anEvent({ id: 'e1' }),
      anEvent({ id: 'e2' }),
    ]);

    const page = await repository.getUpcomingPublicEvents(new Date(), {
      limit: 20,
      offset: 0,
    });

    expect(page.items.map((item) => item.id)).toEqual(['e2', 'e1']);
    expect(page.total).toBe(57);
  });

  it('loads only the events of the page, and none for an empty page', async () => {
    const { repository, findMany } = setup([], 0);

    const page = await repository.getUpcomingPublicEvents(new Date(), {
      limit: 20,
      offset: 100,
    });

    expect(page).toEqual({ items: [], total: 0 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [] } } }),
    );
  });

  it('passes the page, the activities and the folded words as bound values', async () => {
    const { repository, queryRaw } = setup([], 0);

    await repository.getUpcomingPublicEvents(
      new Date(),
      { limit: 20, offset: 40 },
      { activityIds: ['a1', 'a2'], search: ' Šachy Brno ', location: 'Žabo' },
    );

    // The page query and the count share one condition.
    expect(queryRaw).toHaveBeenCalledTimes(2);
    const values = sqlValues(queryRaw.mock.calls[0] as unknown[]);
    expect(values).toEqual(
      expect.arrayContaining(['a1', 'a2', 'sachy', 'brno', 'zabo', 20, 40]),
    );
  });
});

describe('EventRepository.getPublicEventById', () => {
  it('only looks at public, visible events that are not drafts', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { event: { findFirst } } as unknown as PrismaService;

    await expect(
      new EventRepository(prisma).getPublicEventById('e1'),
    ).resolves.toBeNull();

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'e1',
          status: { not: 'DRAFT' },
          visibility: 'PUBLIC',
          isHidden: false,
        },
      }),
    );
  });

  it('exposes the organizer by name and keeps contact and address details out', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      ...anEvent(),
      description: 'Popis',
      equipment: 'Hokejka',
      contributionAmount: '80.00',
      status: 'PUBLISHED',
      approvalMode: 'MANUAL',
      organizer: { name: 'Jana Nováková' },
      participations: [
        { user: { birthDate: new Date('1990-01-01'), gender: 'MALE' } },
      ],
    });
    const prisma = { event: { findFirst } } as unknown as PrismaService;

    const detail = await new EventRepository(prisma).getPublicEventById('e1');

    expect(detail).toMatchObject({
      organizerName: 'Jana Nováková',
      contributionAmount: 80,
      takenCount: 3,
      stats: null,
    });
    expect(detail).not.toHaveProperty('onlineUrl');
    expect(detail).not.toHaveProperty('locationStreet');
    expect(detail).not.toHaveProperty('locationLatitude');
    expect(JSON.stringify(detail)).not.toContain('1990-01-01');
  });
});

describe('EventRepository.getPublicEventSeatFacts', () => {
  const row = {
    id: 'e1',
    status: 'PUBLISHED',
    startAt: new Date('2030-01-01T18:00:00Z'),
    minParticipants: 4,
    maxParticipants: 5,
    externalOccupiedSpots: 2,
    organizerId: 'organizer',
    coOrganizers: [{ id: 'co-organizer' }],
    participations: [{ userId: 'u1' }, { userId: 'u2' }],
  };

  it('uses the visibility of the public detail', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { event: { findFirst } } as unknown as PrismaService;

    await expect(
      new EventRepository(prisma).getPublicEventSeatFacts('e1', 'u1'),
    ).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'e1',
          status: { not: 'DRAFT' },
          visibility: 'PUBLIC',
          isHidden: false,
        },
      }),
    );
  });

  it('counts free seats like the occupancy and finds the person among the approved', async () => {
    const findFirst = jest.fn().mockResolvedValue(row);
    const prisma = { event: { findFirst } } as unknown as PrismaService;
    const repository = new EventRepository(prisma);

    await expect(
      repository.getPublicEventSeatFacts('e1', 'u1'),
    ).resolves.toEqual({
      id: 'e1',
      status: 'PUBLISHED',
      startAt: row.startAt,
      organizerIds: ['organizer', 'co-organizer'],
      freeSpots: 1,
      hasSeat: true,
    });
    await expect(
      repository.getPublicEventSeatFacts('e1', 'u3'),
    ).resolves.toMatchObject({ hasSeat: false });
  });
});
