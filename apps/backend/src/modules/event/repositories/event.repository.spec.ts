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
    const prisma = { event: { findMany } } as unknown as PrismaService;
    const now = new Date('2026-10-20T10:00:00Z');

    await new EventRepository(prisma).getUpcomingPublicEvents(now);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          isHidden: false,
          endAt: { gt: now },
        },
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });
});
