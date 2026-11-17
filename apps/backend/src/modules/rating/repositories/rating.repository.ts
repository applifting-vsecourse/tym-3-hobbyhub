import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  areEventRatingsRevealed,
  GivenRatingPage,
  NewRating,
  NO_RATING_SCORE,
  Page,
  RATEABLE_SEAT_STATUSES,
  Rating,
  RatingDirection,
  RatingEventFacts,
  RatingPerson,
  RatingScore,
  ReceivedRatingPage,
  SeatStatus,
  StarDistribution,
  UserRatingScores,
} from '@/modules/rating/domain/rating';
import { Injectable } from '@nestjs/common';

const ratingSelect = {
  id: true,
  eventId: true,
  participantId: true,
  direction: true,
  authorId: true,
  ratedUserId: true,
  stars: true,
  comment: true,
  createdAt: true,
} as const satisfies Prisma.RatingSelect;

type ScoreRow = {
  direction?: RatingDirection;
  count: number;
  average: number | null;
};

const scoreOf = (row: ScoreRow | undefined): RatingScore =>
  row ? { count: row.count, average: row.average } : NO_RATING_SCORE;

// #236, ADR-0027. The only place that touches the ratings. The scores and
// everything a rated person sees are read from the views of the migration
// (`rating_revealed`, `user_rating_score`, `event_rating_score`), which hold
// the rule of when a rating is revealed; this file never repeats it in SQL.
// Trusts the layers above: it validates nothing.
@Injectable()
export class RatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getEventFacts(eventId: string): Promise<RatingEventFacts | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        status: true,
        endAt: true,
        isHidden: true,
        organizer: { select: { id: true, name: true } },
        coOrganizers: { select: { id: true } },
      },
    });
    if (!event) return null;
    return {
      id: event.id,
      title: event.title,
      status: event.status,
      endAt: event.endAt,
      isHidden: event.isHidden,
      organizerId: event.organizer.id,
      organizerName: event.organizer.name,
      coOrganizerIds: event.coOrganizers.map(({ id }) => id),
    };
  }

  /** The person's seat at the event, whatever its state; null when none. */
  async getSeatStatus(
    eventId: string,
    userId: string,
  ): Promise<SeatStatus | null> {
    const participation = await this.prisma.participation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    });
    return participation?.status ?? null;
  }

  async findRating(
    eventId: string,
    participantId: string,
    direction: RatingDirection,
  ): Promise<Rating | null> {
    return this.prisma.rating.findUnique({
      where: {
        eventId_participantId_direction: { eventId, participantId, direction },
      },
      select: ratingSelect,
    });
  }

  /** The ratings the person gave at the event, either way. */
  async getRatingsByAuthorAt(
    eventId: string,
    authorId: string,
  ): Promise<Rating[]> {
    return this.prisma.rating.findMany({
      where: { eventId, authorId },
      select: ratingSelect,
    });
  }

  /**
   * Everyone who had a seat at the end of the event, whether they came or
   * not, by name. Without the people in `excludedIds` (the organizers, people
   * blocked from the one asking).
   */
  async getRateableParticipants(
    eventId: string,
    excludedIds: readonly string[],
  ): Promise<(RatingPerson & { seat: SeatStatus })[]> {
    const participations = await this.prisma.participation.findMany({
      where: {
        eventId,
        status: { in: [...RATEABLE_SEAT_STATUSES] },
        userId: { notIn: [...excludedIds] },
      },
      select: { status: true, user: { select: { id: true, name: true } } },
      orderBy: { user: { name: 'asc' } },
    });
    return participations.map(({ status, user }) => ({
      id: user.id,
      name: user.name,
      seat: status,
    }));
  }

  /**
   * Saves a new rating. Null when the participation already has a rating that
   * way: someone else was quicker, so the caller reports it as already rated.
   */
  async create(rating: NewRating): Promise<Rating | null> {
    try {
      return await this.prisma.rating.create({
        data: rating,
        select: ratingSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }

  /** The person's two scores, from `user_rating_score`. */
  async getUserScores(userId: string): Promise<UserRatingScores> {
    const rows = await this.prisma.$queryRaw<ScoreRow[]>`
      SELECT "direction", "count", "average"
      FROM "user_rating_score"
      WHERE "userId" = ${userId}`;
    return {
      asOrganizer: scoreOf(rows.find((r) => r.direction === 'TO_ORGANIZER')),
      asParticipant: scoreOf(
        rows.find((r) => r.direction === 'TO_PARTICIPANT'),
      ),
    };
  }

  /** The score of an event, from `event_rating_score`. */
  async getEventScore(eventId: string): Promise<RatingScore> {
    const rows = await this.prisma.$queryRaw<ScoreRow[]>`
      SELECT "count", "average"
      FROM "event_rating_score"
      WHERE "eventId" = ${eventId}`;
    return scoreOf(rows[0]);
  }

  /**
   * The revealed ratings the person received one way, newest first, with the
   * score and how many of them have each number of stars. The ratings of
   * authors in `hiddenAuthorIds` are left out of the list, but they still
   * count in the score: a block hides people, it does not undo ratings.
   */
  async getReceived(
    userId: string,
    direction: RatingDirection,
    page: Page,
    hiddenAuthorIds: readonly string[],
  ): Promise<ReceivedRatingPage> {
    const notHidden =
      hiddenAuthorIds.length > 0
        ? Prisma.sql`AND r."authorId" NOT IN (${Prisma.join(hiddenAuthorIds)})`
        : Prisma.empty;
    const [items, totals, distribution, scores] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: string;
          stars: number;
          comment: string | null;
          createdAt: Date;
          eventId: string;
          eventTitle: string;
          authorId: string;
          authorName: string;
          authorStatus: string;
        }[]
      >`
        SELECT r."id", r."stars", r."comment", r."createdAt",
               e."id" AS "eventId", e."title" AS "eventTitle",
               u."id" AS "authorId", u."name" AS "authorName",
               u."status"::text AS "authorStatus"
        FROM "rating_revealed" r
        JOIN "event" e ON e."id" = r."eventId"
        JOIN "user" u ON u."id" = r."authorId"
        WHERE r."ratedUserId" = ${userId}
          AND r."direction" = ${direction}::"rating_direction"
          ${notHidden}
        ORDER BY r."createdAt" DESC, r."id"
        LIMIT ${page.limit} OFFSET ${page.offset}`,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::integer AS "total"
        FROM "rating_revealed" r
        WHERE r."ratedUserId" = ${userId}
          AND r."direction" = ${direction}::"rating_direction"
          ${notHidden}`,
      this.prisma.$queryRaw<{ stars: number; count: number }[]>`
        SELECT r."stars", COUNT(*)::integer AS "count"
        FROM "rating_revealed" r
        WHERE r."ratedUserId" = ${userId}
          AND r."direction" = ${direction}::"rating_direction"
        GROUP BY r."stars"`,
      this.getUserScores(userId),
    ]);

    const stars: StarDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distribution) {
      stars[row.stars as keyof StarDistribution] = row.count;
    }
    return {
      score:
        direction === 'TO_ORGANIZER'
          ? scores.asOrganizer
          : scores.asParticipant,
      distribution: stars,
      total: totals[0]?.total ?? 0,
      items: items.map((row) => ({
        id: row.id,
        direction,
        stars: row.stars,
        comment: row.comment,
        createdAt: row.createdAt,
        event: { id: row.eventId, title: row.eventTitle },
        author:
          row.authorStatus === 'DELETED'
            ? null
            : { id: row.authorId, name: row.authorName },
      })),
    };
  }

  /**
   * The ratings the person gave, newest first, revealed or not. Without the
   * ratings of people in `hiddenUserIds`, who do not exist for them.
   */
  async getGiven(
    authorId: string,
    page: Page,
    hiddenUserIds: readonly string[],
    now: Date,
  ): Promise<GivenRatingPage> {
    const where = {
      authorId,
      ratedUserId: { notIn: [...hiddenUserIds] },
    } satisfies Prisma.RatingWhereInput;
    const [ratings, total] = await Promise.all([
      this.prisma.rating.findMany({
        where,
        select: {
          id: true,
          direction: true,
          stars: true,
          comment: true,
          createdAt: true,
          participation: {
            select: {
              event: {
                select: {
                  id: true,
                  title: true,
                  endAt: true,
                  status: true,
                  isHidden: true,
                },
              },
            },
          },
          ratedUser: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: page.limit,
        skip: page.offset,
      }),
      this.prisma.rating.count({ where }),
    ]);
    return {
      total,
      items: ratings.map(
        ({ participation: { event }, ratedUser, ...rating }) => ({
          ...rating,
          event: { id: event.id, title: event.title },
          ratedUser,
          isRevealed: areEventRatingsRevealed(event, now),
        }),
      ),
    };
  }
}
