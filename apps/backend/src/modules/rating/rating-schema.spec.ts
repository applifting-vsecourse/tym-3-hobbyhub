// Database constraints and views of ratings (#236, ADR-0027). Like
// event-schema.spec.ts, the suite needs a real PostgreSQL with the migrations
// applied and only runs on request:
//   DB_TESTS=1 pnpm backend test rating-schema
//
// Every case runs in a transaction that is rolled back. The views compare with
// the database's own clock, so the events are placed in the past instead of
// moving the clock.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ParticipationStatus,
  Prisma,
  VenueType,
} from '@/generated/prisma/client';
import {
  RATING_MIN_COUNT_TO_SHOW,
  RATING_WINDOW_DAYS,
  RatingDirection,
} from '@/modules/rating/domain/rating';
import { RatingRepository } from '@/modules/rating/repositories/rating.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

const random = (): string => Math.random().toString(36).slice(2);
const DAY_MS = 24 * 60 * 60 * 1000;

describeDb('rating schema constraints and views', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

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

  const repositoryOf = (tx: Prisma.TransactionClient): RatingRepository =>
    new RatingRepository(tx as unknown as PrismaService);

  const createUser = async (tx: Prisma.TransactionClient): Promise<string> => {
    const now = new Date();
    const user = await tx.user.create({
      data: {
        id: `test-${random()}`,
        name: `Test ${random()}`,
        email: `test-${random()}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    return user.id;
  };

  /** An event that ended `endedDaysAgo` days ago, with seated participants. */
  const createEvent = async (
    tx: Prisma.TransactionClient,
    {
      organizerId,
      participantIds,
      endedDaysAgo,
      data = {},
    }: {
      organizerId: string;
      participantIds: string[];
      endedDaysAgo: number;
      data?: Partial<Prisma.EventUncheckedCreateInput>;
    },
  ): Promise<string> => {
    const category = await tx.activityCategory.create({
      data: {
        name: `cat-${random()}`,
        icon: `cat-${random()}`,
        order: Math.floor(Math.random() * 2_000_000_000),
      },
    });
    const activity = await tx.activity.create({
      data: {
        name: `act-${random()}`,
        icon: 'badminton',
        categoryId: category.id,
        defaultMinParticipants: 2,
        defaultMaxParticipants: 10,
      },
    });
    const endAt = new Date(Date.now() - endedDaysAgo * DAY_MS);
    const event = await tx.event.create({
      data: {
        title: 'Badminton',
        description: 'Test',
        status: 'PUBLISHED',
        venueType: VenueType.PUBLIC_VENUE,
        startAt: new Date(endAt.getTime() - 2 * 3600 * 1000),
        endAt,
        minParticipants: 2,
        maxParticipants: 10,
        locationStreet: 'Ulice 1',
        locationCity: 'Praha',
        locationPostalCode: '11000',
        locationCountry: 'Česko',
        activityId: activity.id,
        organizerId,
        ...data,
      },
    });
    await tx.participation.createMany({
      data: participantIds.map((userId) => ({
        eventId: event.id,
        userId,
        status: ParticipationStatus.APPROVED,
      })),
    });
    return event.id;
  };

  const rateOrganizer = (
    tx: Prisma.TransactionClient,
    eventId: string,
    participantId: string,
    organizerId: string,
    stars: number,
  ): Promise<unknown> =>
    tx.rating.create({
      data: {
        eventId,
        participantId,
        direction: 'TO_ORGANIZER',
        authorId: participantId,
        ratedUserId: organizerId,
        stars,
      },
    });

  type RevealedEvent = {
    organizerId: string;
    participantIds: string[];
    eventId: string;
  };

  /** An organizer, three participants and an event that ended long ago. */
  const aRevealedEvent = async (
    tx: Prisma.TransactionClient,
    endedDaysAgo = RATING_WINDOW_DAYS + 1,
    data: Partial<Prisma.EventUncheckedCreateInput> = {},
  ): Promise<RevealedEvent> => {
    const organizerId = await createUser(tx);
    const participantIds = [
      await createUser(tx),
      await createUser(tx),
      await createUser(tx),
    ];
    const eventId = await createEvent(tx, {
      organizerId,
      participantIds,
      endedDaysAgo,
      data,
    });
    return { organizerId, participantIds, eventId };
  };

  describe('rating', () => {
    it('accepts a rating each way for one participation', async () => {
      await inRolledBackTransaction(async (tx) => {
        const { organizerId, participantIds, eventId } =
          await aRevealedEvent(tx);
        const [p] = participantIds;
        await rateOrganizer(tx, eventId, p, organizerId, 5);
        await tx.rating.create({
          data: {
            eventId,
            participantId: p,
            direction: 'TO_PARTICIPANT',
            authorId: organizerId,
            ratedUserId: p,
            stars: 2,
            comment: 'Přišel pozdě.',
          },
        });
      });
    });

    it('refuses a second rating the same way (unique)', async () => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const { organizerId, participantIds, eventId } =
            await aRevealedEvent(tx);
          await rateOrganizer(tx, eventId, participantIds[0], organizerId, 5);
          await rateOrganizer(tx, eventId, participantIds[0], organizerId, 4);
        }),
      ).rejects.toThrow(/Unique constraint/);
    });

    it('refuses a rating without a participation (foreign key)', async () => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const { organizerId, eventId } = await aRevealedEvent(tx);
          const stranger = await createUser(tx);
          await rateOrganizer(tx, eventId, stranger, organizerId, 5);
        }),
      ).rejects.toThrow(/Foreign key constraint/);
    });

    it.each([
      ['rating_stars_range', { stars: 0 }],
      ['rating_stars_range', { stars: 6 }],
      ['rating_comment_not_blank', { comment: '   ' }],
    ])('refuses what %s forbids', async (constraint, data) => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const { organizerId, participantIds, eventId } =
            await aRevealedEvent(tx);
          await tx.rating.create({
            data: {
              eventId,
              participantId: participantIds[0],
              direction: 'TO_ORGANIZER',
              authorId: participantIds[0],
              ratedUserId: organizerId,
              stars: 5,
              ...data,
            },
          });
        }),
      ).rejects.toThrow(new RegExp(constraint));
    });

    it('refuses a participant on the wrong side (rating_participant_side)', async () => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const { organizerId, participantIds, eventId } =
            await aRevealedEvent(tx);
          await tx.rating.create({
            data: {
              eventId,
              participantId: participantIds[0],
              direction: 'TO_ORGANIZER',
              authorId: participantIds[1],
              ratedUserId: organizerId,
              stars: 5,
            },
          });
        }),
      ).rejects.toThrow(/rating_participant_side/);
    });

    it('refuses rating oneself (rating_not_self)', async () => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const { participantIds, eventId } = await aRevealedEvent(tx);
          const [p] = participantIds;
          await tx.rating.create({
            data: {
              eventId,
              participantId: p,
              direction: 'TO_PARTICIPANT',
              authorId: p,
              ratedUserId: p,
              stars: 5,
            },
          });
        }),
      ).rejects.toThrow(/rating_not_self/);
    });
  });

  // ADR-0027: the views are the one place that decides what counts.
  describe('scores', () => {
    const rateAll = async (
      tx: Prisma.TransactionClient,
      event: RevealedEvent,
      stars: number[],
    ): Promise<void> => {
      for (const [i, value] of stars.entries()) {
        await rateOrganizer(
          tx,
          event.eventId,
          event.participantIds[i],
          event.organizerId,
          value,
        );
      }
    };

    it('counts the ratings once the rating period is over', async () => {
      await inRolledBackTransaction(async (tx) => {
        const event = await aRevealedEvent(tx);
        await rateAll(tx, event, [5, 4, 3]);
        const repository = repositoryOf(tx);
        await expect(
          repository.getUserScores(event.organizerId),
        ).resolves.toEqual({
          asOrganizer: { count: 3, average: 4 },
          asParticipant: { count: 0, average: null },
        });
        await expect(repository.getEventScore(event.eventId)).resolves.toEqual({
          count: 3,
          average: 4,
        });
      });
    });

    it('counts nothing while the rating period is on', async () => {
      await inRolledBackTransaction(async (tx) => {
        const event = await aRevealedEvent(tx, RATING_WINDOW_DAYS - 1);
        await rateAll(tx, event, [5, 4, 3]);
        await expect(
          repositoryOf(tx).getUserScores(event.organizerId),
        ).resolves.toMatchObject({ asOrganizer: { count: 0, average: null } });
      });
    });

    it.each([
      [
        'an event an administrator hid',
        {
          isHidden: true,
          hiddenAt: new Date(),
          hiddenReason: 'Podvodná akce',
        },
      ],
      ['an event that did not take place', { status: 'NOT_HELD' as const }],
    ])('counts nothing of %s', async (_case, data) => {
      await inRolledBackTransaction(async (tx) => {
        const event = await aRevealedEvent(tx, RATING_WINDOW_DAYS + 1);
        await rateAll(tx, event, [5, 4, 3]);
        await tx.event.update({ where: { id: event.eventId }, data });
        await expect(
          repositoryOf(tx).getEventScore(event.eventId),
        ).resolves.toEqual({ count: 0, average: null });
      });
    });

    it(`publishes the average from ${RATING_MIN_COUNT_TO_SHOW} ratings on`, async () => {
      await inRolledBackTransaction(async (tx) => {
        const event = await aRevealedEvent(tx);
        await rateAll(tx, event, [5, 4]);
        const read = (): Promise<{ count: number; publicAverage: unknown }[]> =>
          tx.$queryRaw`
            SELECT "count", "publicAverage" FROM "user_rating_score"
            WHERE "userId" = ${event.organizerId}`;
        await expect(read()).resolves.toEqual([
          { count: 2, publicAverage: null },
        ]);
        await rateOrganizer(
          tx,
          event.eventId,
          event.participantIds[2],
          event.organizerId,
          3,
        );
        await expect(read()).resolves.toEqual([{ count: 3, publicAverage: 4 }]);
      });
    });

    it('keeps the two roles apart and the event score to its participants', async () => {
      await inRolledBackTransaction(async (tx) => {
        const event = await aRevealedEvent(tx);
        const [p] = event.participantIds;
        await rateOrganizer(tx, event.eventId, p, event.organizerId, 2);
        await tx.rating.create({
          data: {
            eventId: event.eventId,
            participantId: p,
            direction: 'TO_PARTICIPANT' satisfies RatingDirection,
            authorId: event.organizerId,
            ratedUserId: p,
            stars: 5,
          },
        });
        const repository = repositoryOf(tx);
        await expect(repository.getUserScores(p)).resolves.toEqual({
          asOrganizer: { count: 0, average: null },
          asParticipant: { count: 1, average: 5 },
        });
        await expect(repository.getEventScore(event.eventId)).resolves.toEqual({
          count: 1,
          average: 2,
        });
      });
    });

    it('lists the revealed ratings received, with authors and the distribution', async () => {
      await inRolledBackTransaction(async (tx) => {
        const event = await aRevealedEvent(tx);
        await rateAll(tx, event, [5, 5, 1]);
        const page = await repositoryOf(tx).getReceived(
          event.organizerId,
          'TO_ORGANIZER',
          { limit: 10, offset: 0 },
        );
        expect(page.score).toEqual({ count: 3, average: 11 / 3 });
        expect(page.distribution).toEqual({ 1: 1, 2: 0, 3: 0, 4: 0, 5: 2 });
        expect(page.total).toBe(3);
        expect(page.items.map((item) => item.author?.id).sort()).toEqual(
          [...event.participantIds].sort(),
        );
      });
    });

    // ADR-0022, review of PR #264: a rating between two people blocked from
    // each other counts nowhere, so no number differs from the list and
    // nothing gives the block away. It comes back once the block is lifted.
    it.each([
      ['the author blocked the rated one', 'author'],
      ['the rated one blocked the author', 'rated'],
    ] as const)(
      'counts no rating between a blocked pair (%s)',
      async (_case, blocker) => {
        await inRolledBackTransaction(async (tx) => {
          const event = await aRevealedEvent(tx);
          await rateAll(tx, event, [5, 5, 1]);
          const author = event.participantIds[2];
          const block = await tx.userBlock.create({
            data:
              blocker === 'author'
                ? { blockerId: author, blockedId: event.organizerId }
                : { blockerId: event.organizerId, blockedId: author },
          });
          const repository = repositoryOf(tx);

          const page = await repository.getReceived(
            event.organizerId,
            'TO_ORGANIZER',
            { limit: 10, offset: 0 },
          );
          expect(page.score).toEqual({ count: 2, average: 5 });
          expect(page.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 2 });
          expect(page.total).toBe(2);
          expect(page.items).toHaveLength(2);
          await expect(
            repository.getEventScore(event.eventId),
          ).resolves.toEqual({ count: 2, average: 5 });

          await tx.userBlock.delete({ where: { id: block.id } });
          await expect(
            repository.getUserScores(event.organizerId),
          ).resolves.toMatchObject({ asOrganizer: { count: 3 } });
        });
      },
    );
  });
});
