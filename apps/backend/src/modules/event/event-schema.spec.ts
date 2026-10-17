// Database constraints from the domain model (CHECK, unique). They need a real
// PostgreSQL with the migrations applied, which CI does not start, so the suite
// only runs on request:  DB_TESTS=1 pnpm backend test event-schema
//
// Every case runs in a transaction that is rolled back, so the database the
// test points at (DATABASE_URL) is left exactly as it was.
//
// The suite builds PrismaService by hand, outside Nest's config loading, so
// DATABASE_URL has to come from .env here. Variables already set (CI) win.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EventStatus,
  ParticipationStatus,
  Prisma,
  User,
  VenueType,
} from '@/generated/prisma/client';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

describeDb('event schema constraints', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Runs `work` in a transaction and always rolls it back. Resolves when
  // `work` succeeds, rejects with the database error when it violates a rule.
  const inRolledBackTransaction = async (
    work: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        await work(tx);
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };

  const baseEvent = async (
    tx: Prisma.TransactionClient,
  ): Promise<{ user: User; data: Prisma.EventUncheckedCreateInput }> => {
    const now = new Date();
    const user = await tx.user.create({
      data: {
        id: `test-${Math.random().toString(36).slice(2)}`,
        name: 'Test User',
        email: `test-${Math.random().toString(36).slice(2)}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    const category = await tx.activityCategory.create({
      data: { name: `cat-${Math.random().toString(36).slice(2)}` },
    });
    const activity = await tx.activity.create({
      data: {
        name: `act-${Math.random().toString(36).slice(2)}`,
        icon: 'florbal',
        categoryId: category.id,
        defaultMinParticipants: 2,
        defaultMaxParticipants: 10,
      },
    });
    const start = new Date('2030-01-01T18:00:00Z');
    const data = {
      title: 'Test',
      description: 'Test',
      venueType: VenueType.PUBLIC_VENUE,
      startAt: start,
      endAt: new Date(start.getTime() + 2 * 3600 * 1000),
      minParticipants: 4,
      maxParticipants: 8,
      fillDeadlineHours: 3,
      locationStreet: 'Ulice 1',
      locationCity: 'Praha',
      locationPostalCode: '11000',
      locationCountry: 'Česko',
      locationLatitude: 50.08,
      locationLongitude: 14.43,
      activityId: activity.id,
      organizerId: user.id,
    };
    return { user, data };
  };

  it('accepts a valid event and organizer participation', async () => {
    await inRolledBackTransaction(async (tx) => {
      const { user, data } = await baseEvent(tx);
      const event = await tx.event.create({ data });
      await tx.participation.create({
        data: {
          eventId: event.id,
          userId: user.id,
          status: ParticipationStatus.APPROVED,
        },
      });
    });
  });

  it.each([
    ['event_end_after_start', { endAt: new Date('2029-01-01T00:00:00Z') }],
    ['event_min_lte_max', { minParticipants: 9, maxParticipants: 8 }],
    ['event_external_spots_non_negative', { externalOccupiedSpots: -1 }],
    ['event_external_spots_lte_max', { externalOccupiedSpots: 9 }],
    ['event_location_all_or_nothing', { locationCity: null }],
    [
      'event_online_has_no_location',
      { venueType: VenueType.ONLINE, onlineUrl: 'https://meet.example.com/x' },
    ],
    [
      'event_online_url_only_online',
      { onlineUrl: 'https://meet.example.com/x' },
    ],
  ])('rejects %s', async (constraint, override) => {
    await expect(
      inRolledBackTransaction(async (tx) => {
        const { data } = await baseEvent(tx);
        await tx.event.create({ data: { ...data, ...override } });
      }),
    ).rejects.toThrow(constraint);
  });

  it('accepts an online event without an address', async () => {
    await inRolledBackTransaction(async (tx) => {
      const { data } = await baseEvent(tx);
      await tx.event.create({
        data: {
          ...data,
          venueType: VenueType.ONLINE,
          onlineUrl: 'https://meet.example.com/x',
          locationStreet: null,
          locationCity: null,
          locationPostalCode: null,
          locationCountry: null,
          locationLatitude: null,
          locationLongitude: null,
        },
      });
    });
  });

  it('keeps the waitlist position in step with the status', async () => {
    await expect(
      inRolledBackTransaction(async (tx) => {
        const { user, data } = await baseEvent(tx);
        const event = await tx.event.create({ data });
        await tx.participation.create({
          data: {
            eventId: event.id,
            userId: user.id,
            status: ParticipationStatus.WAITLISTED,
          },
        });
      }),
    ).rejects.toThrow('participation_waitlist_position');

    await expect(
      inRolledBackTransaction(async (tx) => {
        const { user, data } = await baseEvent(tx);
        const event = await tx.event.create({ data });
        await tx.participation.create({
          data: {
            eventId: event.id,
            userId: user.id,
            status: ParticipationStatus.APPROVED,
            waitlistPosition: 1,
          },
        });
      }),
    ).rejects.toThrow('participation_waitlist_position');
  });

  it('requires a deadline for an invitation', async () => {
    await expect(
      inRolledBackTransaction(async (tx) => {
        const { user, data } = await baseEvent(tx);
        const event = await tx.event.create({ data });
        await tx.participation.create({
          data: {
            eventId: event.id,
            userId: user.id,
            status: ParticipationStatus.INVITED,
          },
        });
      }),
    ).rejects.toThrow('participation_invited_has_offer');
  });

  it('lets a person join an event only once', async () => {
    await expect(
      inRolledBackTransaction(async (tx) => {
        const { user, data } = await baseEvent(tx);
        const event = await tx.event.create({
          data: { ...data, status: EventStatus.PUBLISHED },
        });
        const participation = {
          eventId: event.id,
          userId: user.id,
          status: ParticipationStatus.APPROVED,
        };
        await tx.participation.create({ data: participation });
        await tx.participation.create({ data: participation });
      }),
    ).rejects.toThrow();
  });
});
