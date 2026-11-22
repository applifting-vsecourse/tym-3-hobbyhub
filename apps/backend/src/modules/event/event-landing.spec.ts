// The landing rows (#215) against a real PostgreSQL, because what each row
// picks, and in which order, lives in SQL. Like event-list-search.spec.ts it
// only runs on request:
//   DB_TESTS=1 pnpm backend test event-landing
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EventStatus,
  ParticipationStatus,
  Prisma,
  VenueType,
} from '@/generated/prisma/client';
import { LandingEventSelection } from './domain/event';
import { EventRepository } from './repositories/event.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

// Far ahead of any real event, so the cases only see their own.
const NOW = new Date('2039-06-01T10:00:00Z');
const HOUR = 3600 * 1000;

type Fixture = {
  repository: EventRepository;
  tx: Prisma.TransactionClient;
  organizer: string;
  viewer: string;
  friend: string;
  activityIds: string[];
  event: (
    override?: Partial<Prisma.EventUncheckedCreateInput>,
  ) => Promise<string>;
  seat: (
    eventId: string,
    userId: string,
    status?: ParticipationStatus,
  ) => Promise<void>;
};

describeDb('landing rows', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const withFixture = async (
    check: (fixture: Fixture) => Promise<void>,
  ): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        const suffix = Math.random().toString(36).slice(2);
        const person = async (name: string): Promise<string> =>
          (
            await tx.user.create({
              data: {
                id: `${name}-${suffix}`,
                name: `${name} ${suffix}`,
                email: `${name}-${suffix}@example.com`,
                emailVerified: true,
                createdAt: NOW,
                updatedAt: NOW,
              },
            })
          ).id;
        const [organizer, viewer, friend] = await Promise.all([
          person('org'),
          person('viewer'),
          person('friend'),
        ]);
        const category = await tx.activityCategory.create({
          data: {
            name: `cat-${suffix}`,
            icon: `cat-${suffix}`,
            order: Math.floor(Math.random() * 2_000_000_000),
          },
        });
        const activityIds: string[] = [];
        for (const name of ['Florbal', 'Šachy']) {
          const activity = await tx.activity.create({
            data: {
              name: `${name} ${suffix}`,
              icon: 'florbal',
              categoryId: category.id,
              defaultMinParticipants: 2,
              defaultMaxParticipants: 10,
            },
          });
          activityIds.push(activity.id);
        }
        let index = 0;
        const event = async (
          override: Partial<Prisma.EventUncheckedCreateInput> = {},
        ): Promise<string> => {
          // One hour apart from two hours after NOW, unless told otherwise.
          const start = new Date(NOW.getTime() + (2 + index++) * HOUR);
          const created = await tx.event.create({
            data: {
              title: `landing ${index}`,
              description: 'Test',
              status: EventStatus.PUBLISHED,
              venueType: VenueType.PLACE,
              isAddressPublic: true,
              startAt: start,
              endAt: new Date(start.getTime() + 2 * HOUR),
              minParticipants: 2,
              maxParticipants: 4,
              locationStreet: 'Ulice 1',
              locationCity: 'Praha',
              locationPostalCode: '11000',
              locationCountry: 'Česko',
              activityId: activityIds[0],
              organizerId: organizer,
              ...override,
            },
          });
          return created.id;
        };
        const seat = async (
          eventId: string,
          userId: string,
          status: ParticipationStatus = ParticipationStatus.APPROVED,
        ): Promise<void> => {
          await tx.participation.create({
            data: {
              eventId,
              userId,
              status,
              // A waitlisted seat has its place in the queue (CHECK).
              waitlistPosition:
                status === ParticipationStatus.WAITLISTED ? 1 : null,
            },
          });
        };
        await check({
          repository: new EventRepository(tx as unknown as PrismaService),
          tx,
          organizer,
          viewer,
          friend,
          activityIds,
          event,
          seat,
        });
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };

  const row = (
    repository: EventRepository,
    selection: Partial<LandingEventSelection>,
    viewerId?: string,
  ): Promise<string[]> =>
    repository.getLandingEventIds(
      NOW,
      { order: 'soonest', limit: 20, ...selection },
      [],
      viewerId,
    );

  it('shows only events not started, with a free seat, not organized by the viewer', async () => {
    await withFixture(async ({ repository, event, seat, viewer, friend }) => {
      const open = await event();
      const full = await event({ minParticipants: 1, maxParticipants: 1 });
      await seat(full, friend);
      const started = await event({
        startAt: new Date(NOW.getTime() - HOUR),
        endAt: new Date(NOW.getTime() + HOUR),
      });
      const own = await event({ organizerId: viewer });
      const draft = await event({ status: EventStatus.DRAFT });

      const ids = await row(repository, {}, viewer);

      expect(ids).toContain(open);
      for (const id of [full, started, own, draft]) {
        expect(ids).not.toContain(id);
      }
    });
  });

  it('keeps "Last minute" to the events that start before the limit', async () => {
    await withFixture(async ({ repository, event }) => {
      const soon = await event({
        startAt: new Date(NOW.getTime() + 3 * HOUR),
        endAt: new Date(NOW.getTime() + 5 * HOUR),
      });
      const later = await event({
        startAt: new Date(NOW.getTime() + 5 * HOUR),
        endAt: new Date(NOW.getTime() + 7 * HOUR),
      });

      const ids = await row(repository, {
        startsBefore: new Date(NOW.getTime() + 4 * HOUR),
      });

      expect(ids).toEqual([soon]);
      expect(ids).not.toContain(later);
    });
  });

  it('narrows the public list to "Last minute" (#215)', async () => {
    await withFixture(async ({ repository, event }) => {
      const soon = await event({
        startAt: new Date(NOW.getTime() + 3 * HOUR),
        endAt: new Date(NOW.getTime() + 5 * HOUR),
      });
      await event({
        startAt: new Date(NOW.getTime() + 5 * HOUR),
        endAt: new Date(NOW.getTime() + 7 * HOUR),
      });
      await event({
        startAt: new Date(NOW.getTime() - HOUR),
        endAt: new Date(NOW.getTime() + HOUR),
      });

      const page = await repository.getUpcomingPublicEvents(
        NOW,
        { limit: 50, offset: 0 },
        { activityIds: [], startsWithinHours: 4 },
      );

      expect(page.items.map((item) => item.id)).toEqual([soon]);
      expect(page.total).toBe(1);
    });
  });

  it('matches the city ignoring case and spaces', async () => {
    await withFixture(async ({ repository, event }) => {
      const brno = await event({ locationCity: ' BRNO ' });
      await event({ locationCity: 'Praha' });

      expect(await row(repository, { city: 'brno' })).toEqual([brno]);
    });
  });

  it('finds liked events by the profile, the history and the groups', async () => {
    await withFixture(
      async ({
        repository,
        tx,
        event,
        seat,
        viewer,
        organizer,
        activityIds,
      }) => {
        const [florbal, sachy] = activityIds;
        // Nothing liked yet.
        const byInterest = await event({ activityId: florbal });
        const otherOrganizer = (
          await tx.user.create({
            data: {
              id: `other-${viewer}`,
              name: `other ${viewer}`,
              email: `other-${viewer}@example.com`,
              emailVerified: true,
              createdAt: NOW,
              updatedAt: NOW,
            },
          })
        ).id;
        const byHistory = await event({
          activityId: sachy,
          organizerId: otherOrganizer,
        });
        expect(await row(repository, { likedBy: viewer }, viewer)).toEqual([]);

        // A profile activity.
        await tx.userActivity.create({
          data: { userId: viewer, activityId: florbal },
        });
        expect(await row(repository, { likedBy: viewer }, viewer)).toEqual([
          byInterest,
        ]);

        // A played event of that organizer: their other events are liked too.
        const played = await event({
          activityId: florbal,
          organizerId: otherOrganizer,
          startAt: new Date(NOW.getTime() - 48 * HOUR),
          endAt: new Date(NOW.getTime() - 46 * HOUR),
        });
        await seat(played, viewer, ParticipationStatus.ATTENDED);
        expect(await row(repository, { likedBy: viewer }, viewer)).toEqual([
          byInterest,
          byHistory,
        ]);
        expect(organizer).toBeDefined();
      },
    );
  });

  it('finds events a friend organizes or holds an approved seat on', async () => {
    await withFixture(async ({ repository, event, seat, friend }) => {
      const seated = await event();
      await seat(seated, friend);
      const waiting = await event();
      await seat(waiting, friend, ParticipationStatus.WAITLISTED);
      const organized = await event({ organizerId: friend });
      await event();

      expect(await row(repository, { attendedByAnyOf: [friend] })).toEqual([
        seated,
        organized,
      ]);
      expect(await row(repository, { attendedByAnyOf: [] })).toEqual([]);
    });
  });

  it('puts the fuller event first on "Top akce"', async () => {
    await withFixture(async ({ repository, event, seat, viewer, friend }) => {
      const empty = await event({ maxParticipants: 10 });
      const half = await event({ maxParticipants: 4 });
      await seat(half, viewer);
      await seat(half, friend);

      expect(await row(repository, { order: 'top' })).toEqual([half, empty]);
    });
  });

  it('lists the cities with events, most first, spelled as most spell them', async () => {
    await withFixture(async ({ repository, event }) => {
      await event({ locationCity: 'Brno' });
      await event({ locationCity: 'brno' });
      await event({ locationCity: 'Brno' });
      await event({ locationCity: 'Ostrava' });

      expect(await repository.getLandingCities(NOW, [], 10)).toEqual([
        { city: 'Brno', eventCount: 3 },
        { city: 'Ostrava', eventCount: 1 },
      ]);
    });
  });

  it("tells the viewer's own state and who of the friends goes", async () => {
    await withFixture(
      async ({ repository, tx, event, seat, viewer, friend }) => {
        const joined = await event();
        await seat(joined, viewer);
        await seat(joined, friend);
        const asked = await event({ organizerId: friend });
        await tx.participationRequest.create({
          data: { eventId: asked, userId: viewer, status: 'PENDING' },
        });

        const states = await repository.getViewerStates(
          [joined, asked],
          viewer,
        );
        expect(Object.fromEntries(states)).toEqual({
          [joined]: 'JOINED',
          [asked]: 'PENDING',
        });
        const attendees = await repository.getAttendees(
          [joined, asked],
          [friend],
        );
        expect(attendees).toEqual(
          expect.arrayContaining([
            { eventId: joined, userId: friend },
            { eventId: asked, userId: friend },
          ]),
        );
        expect(attendees).toHaveLength(2);
      },
    );
  });
});
