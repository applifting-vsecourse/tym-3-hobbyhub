import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  EventInterestPage,
  EventInterestRow,
} from '@/modules/event-interest/domain/event-interest';
import {
  EventFilter,
  EventStatus,
  NO_EVENT_FILTER,
  Page,
} from '@/modules/event/domain/event';
import {
  aheadFirstOrder,
  allOf,
  eventFilterConditions,
  visibleTo,
} from '@/modules/event/repositories/event-list.sql';
import { Injectable } from '@nestjs/common';

// #231, ADR-0030: the rows of the "Zajímá mě" list. Validates nothing: the
// service has checked who saves what.
@Injectable()
export class EventInterestRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Idempotent: a second save, from a double tap or another window, is a
  // no-op on the unique pair, never a second row or an error.
  async save(userId: string, eventId: string): Promise<void> {
    await this.prisma.eventInterest.createMany({
      data: [{ userId, eventId }],
      skipDuplicates: true,
    });
  }

  // Idempotent as well: removing what is not there removes nothing. The
  // watching goes with the row (#232).
  async remove(userId: string, eventId: string): Promise<void> {
    await this.prisma.eventInterest.deleteMany({ where: { userId, eventId } });
  }

  // #232: watching saves the event too, in one write; watching it again
  // changes nothing (a double tap, two windows).
  async watch(userId: string, eventId: string): Promise<void> {
    await this.prisma.eventInterest.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId, watchesFreeSpot: true },
      update: { watchesFreeSpot: true },
    });
  }

  // #232: the event stays on the list. Nothing to stop is no error.
  async unwatch(userId: string, eventId: string): Promise<void> {
    await this.prisma.eventInterest.updateMany({
      where: { userId, eventId, watchesFreeSpot: true },
      data: { watchesFreeSpot: false },
    });
  }

  async getRow(userId: string, eventId: string): Promise<EventInterestRow> {
    const row = await this.prisma.eventInterest.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { watchesFreeSpot: true },
    });
    return { isSaved: row !== null, isWatching: row?.watchesFreeSpot ?? false };
  }

  // A page of the person's list, narrowed by the filter of the event list.
  // What is still on comes first, soonest first; then what is over or was
  // called off, latest first. An event the person may no longer see (hidden
  // by an administrator, a group they left, an organizer blocked from them
  // through `filter.hiddenOrganizerIds`) is left out of the page and of the
  // total alike, and comes back once it is visible again: the row stays.
  async getPage(
    userId: string,
    now: Date,
    { limit, offset }: Page,
    filter: EventFilter = NO_EVENT_FILTER,
  ): Promise<EventInterestPage> {
    const where = allOf([
      Prisma.sql`EXISTS (SELECT 1 FROM "event_interest" i
        WHERE i."eventId" = e."id" AND i."userId" = ${userId})`,
      Prisma.sql`e."status" IN ('PUBLISHED', 'CANCELLED', 'FINISHED', 'NOT_HELD')`,
      Prisma.sql`NOT e."isHidden"`,
      visibleTo(userId),
      ...eventFilterConditions(filter),
    ]);
    const isAhead = Prisma.sql`(e."status" = 'PUBLISHED' AND e."endAt" >= ${now})`;
    const [pageRows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<
        { id: string; status: EventStatus; watchesFreeSpot: boolean }[]
      >`
        SELECT e."id", e."status"::text AS "status",
          (SELECT i."watchesFreeSpot" FROM "event_interest" i
            WHERE i."eventId" = e."id" AND i."userId" = ${userId}) AS "watchesFreeSpot"
        FROM "event" e
        JOIN "activity" a ON a."id" = e."activityId"
        WHERE ${where}
        ORDER BY ${aheadFirstOrder(isAhead)}
        LIMIT ${limit} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS "total" FROM "event" e
        JOIN "activity" a ON a."id" = e."activityId"
        WHERE ${where}`,
    ]);
    return {
      items: pageRows.map((row) => ({
        eventId: row.id,
        status: row.status,
        watchesFreeSpot: row.watchesFreeSpot,
      })),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }
}
