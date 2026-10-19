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
    activity: { id: 'a1', name: 'Florbal', icon: 'florbal' } as Activity,
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
  it('asks only for upcoming, public, published, visible events, soonest first', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = { event: { findMany, count } } as unknown as PrismaService;
    const now = new Date('2026-10-20T10:00:00Z');
    const where = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      isHidden: false,
      endAt: { gt: now },
    };

    await new EventRepository(prisma).getUpcomingPublicEvents(now, {
      limit: 20,
      offset: 40,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
        skip: 40,
        take: 20,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where });
  });

  it('returns the total of all matching events next to the page', async () => {
    const prisma = {
      event: {
        findMany: jest.fn().mockResolvedValue([anEvent()]),
        count: jest.fn().mockResolvedValue(57),
      },
    } as unknown as PrismaService;

    const page = await new EventRepository(prisma).getUpcomingPublicEvents(
      new Date(),
      { limit: 20, offset: 0 },
    );

    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(57);
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
