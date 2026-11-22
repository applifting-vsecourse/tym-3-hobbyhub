// The similar events under a detail against a real PostgreSQL, because the
// ranking and the rules of who is offered live in SQL.
// Like event-schema.spec.ts it only runs on request:
//   DB_TESTS=1 pnpm backend test event-similar
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { EventStatus, Prisma, VenueType } from '@/generated/prisma/client';
import { EventRepository } from './repositories/event.repository';

// ADR-0022: hidden means since when and why (CHECK event_hidden_all_or_nothing).
const HIDDEN = {
  isHidden: true,
  hiddenAt: new Date('2030-01-01T00:00:00Z'),
  hiddenReason: 'Skryto správcem v testu.',
} as const;

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

// A word no real event contains, so the cases only see their own events.
const MARK = 'zqxmark';
const NOW = new Date('2029-12-31T00:00:00Z');

describeDb('similar events', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Creates events from `overrides` in a transaction, runs `check` with a
  // repository on that transaction, then rolls everything back.
  // `activity` picks one of the three activities created for the case; it is
  // also handed to `check`, to filter by.
  type EventOverride = Partial<Prisma.EventUncheckedCreateInput> & {
    activity?: 0 | 1 | 2;
  };
  const withEvents = async (
    overrides: EventOverride[],
    check: (
      repository: EventRepository,
      ids: string[],
      activityIds: string[],
    ) => Promise<void>,
  ): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        const suffix = Math.random().toString(36).slice(2);
        const user = await tx.user.create({
          data: {
            id: `test-${suffix}`,
            name: 'Test User',
            email: `test-${suffix}@example.com`,
            emailVerified: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
        });
        const category = await tx.activityCategory.create({
          data: {
            name: `cat-${suffix}`,
            icon: `cat-${suffix}`,
            order: Math.floor(Math.random() * 2_000_000_000),
          },
        });
        const activityIds: string[] = [];
        for (const [index, name] of ['Šachy', 'Tenis', 'Florbal'].entries()) {
          const activity = await tx.activity.create({
            data: {
              name: `${name} ${suffix}`,
              icon: `icon-${index}`,
              categoryId: category.id,
              defaultMinParticipants: 2,
              defaultMaxParticipants: 10,
            },
          });
          activityIds.push(activity.id);
        }
        const ids: string[] = [];
        for (const [index, { activity, ...override }] of overrides.entries()) {
          const start = new Date(`2030-01-0${index + 1}T18:00:00Z`);
          const event = await tx.event.create({
            data: {
              title: `${MARK} akce ${index}`,
              description: 'Test',
              status: EventStatus.PUBLISHED,
              venueType: VenueType.PLACE,
              startAt: start,
              endAt: new Date(start.getTime() + 2 * 3600 * 1000),
              minParticipants: 4,
              maxParticipants: 8,
              fillDeadlineHours: 3,
              locationStreet: 'Ulice 1',
              locationCity: 'Praha',
              locationPostalCode: '11000',
              locationCountry: 'Česko',
              activityId: activityIds[activity ?? 0],
              organizerId: user.id,
              ...override,
            },
          });
          ids.push(event.id);
        }
        await check(
          new EventRepository(tx as unknown as PrismaService),
          ids,
          activityIds,
        );
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };

  const similar = (
    repository: EventRepository,
    id: string,
    hiddenOrganizerIds: string[] = [],
  ): Promise<string[]> =>
    repository
      .getSimilarEvents(id, NOW, hiddenOrganizerIds)
      .then((items) => items.map((item) => item.id));

  const day = (n: number): Date =>
    new Date(`2030-01-${String(n).padStart(2, '0')}T18:00:00Z`);
  const at = (n: number): Partial<Prisma.EventUncheckedCreateInput> => ({
    startAt: day(n),
    endAt: new Date(day(n).getTime() + 2 * 3600 * 1000),
  });

  it('puts the same activity, city and time first, then fills up with the same activity', async () => {
    await withEvents(
      [
        { ...at(10) }, // the viewed one
        { ...at(28), locationCity: 'Praha' }, // far in time
        { ...at(12), locationCity: 'Brno' }, // other city
        { ...at(11), locationCity: 'Praha' }, // full match, nearest
        { ...at(14), locationCity: 'praha' }, // full match, case-insensitive
        { ...at(11), activity: 1 }, // other activity
      ],
      async (repository, ids) => {
        expect(await similar(repository, ids[0])).toEqual([
          ids[3],
          ids[4],
          ids[2],
          ids[1],
        ]);
      },
    );
  });

  it('offers at most four, never the viewed event', async () => {
    await withEvents(
      Array.from({ length: 7 }, (_, i) => ({ ...at(i + 1) })),
      async (repository, ids) => {
        const found = await similar(repository, ids[3]);
        expect(found).toHaveLength(4);
        expect(found).not.toContain(ids[3]);
      },
    );
  });

  it('leaves out past, cancelled, hidden, private, group-only and full events', async () => {
    await withEvents(
      [
        { ...at(10) },
        {
          startAt: new Date('2029-12-01T18:00:00Z'),
          endAt: new Date('2029-12-01T20:00:00Z'),
        },
        { ...at(11), status: EventStatus.CANCELLED },
        { ...at(11), ...HIDDEN },
        { ...at(11), visibility: 'GROUP_ONLY' },
        { ...at(11), maxParticipants: 4, externalOccupiedSpots: 4 },
        { ...at(11) }, // the only one that is fine
      ],
      async (repository, ids) => {
        expect(await similar(repository, ids[0])).toEqual([ids[6]]);
      },
    );
  });

  it('ignores the city when the viewed event is online', async () => {
    await withEvents(
      [
        {
          ...at(10),
          venueType: VenueType.ONLINE,
          locationStreet: null,
          locationCity: null,
          locationPostalCode: null,
          locationCountry: null,
        },
        { ...at(30), locationCity: 'Brno' },
        { ...at(11), locationCity: 'Ostrava' },
      ],
      async (repository, ids) => {
        expect(await similar(repository, ids[0])).toEqual([ids[2], ids[1]]);
      },
    );
  });

  it('leaves out events of organizers blocked from the viewer', async () => {
    await withEvents(
      [{ ...at(10) }, { ...at(11) }],
      async (repository, ids) => {
        const organizer = (await repository.getEventFacts(ids[1]))
          ?.organizerIds[0] as string;
        expect(await similar(repository, ids[0], [organizer])).toEqual([]);
      },
    );
  });
});
