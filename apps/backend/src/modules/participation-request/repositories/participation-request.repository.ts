import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EventStatus,
  ParticipationStatus,
  Prisma,
  ParticipationRequest as PrismaParticipationRequest,
  RequestStatus,
} from '@/generated/prisma/client';
import {
  EventFilter,
  NO_EVENT_FILTER,
  occupancyOf,
  Page,
} from '@/modules/event/domain/event';
import {
  aheadFirstOrder,
  allOf,
  eventFilterConditions,
} from '@/modules/event/repositories/event-list.sql';
import {
  ApplicantProfile,
  ApplicationFactsPage,
  CancelRuleViolation,
  DecidedRequestPage,
  DecidedStatus,
  DecisionRuleViolation,
  EventStateViolation,
  eventStateViolation,
  JoinRuleViolation,
  ParticipantPage,
  ParticipationRequest,
  PendingRequestPage,
  SeatStatus,
} from '@/modules/participation-request/domain/participation-request';
import { Injectable } from '@nestjs/common';

const mapToDomain = (
  request: PrismaParticipationRequest,
): ParticipationRequest => ({
  id: request.id,
  eventId: request.eventId,
  userId: request.userId,
  status: request.status,
  message: request.message,
  requestedAt: request.requestedAt,
  decidedAt: request.decidedAt,
  rejectionReason: request.rejectionReason,
});

// All the organizer may see of the person asking; the rest of the row stays
// here.
const applicantSelect = {
  name: true,
  image: true,
  bio: true,
  emailVerified: true,
} as const satisfies Prisma.UserSelect;

const mapApplicant = (user: {
  name: string;
  image: string | null;
  bio: string | null;
  emailVerified: boolean;
}): ApplicantProfile => ({
  name: user.name,
  image: user.image,
  bio: user.bio,
  hasVerifiedEmail: user.emailVerified,
});

// The event row is locked first, so two people taking the last seat at the
// same moment queue up and the second one finds it gone, which the service's
// read before the write cannot settle.
const lockEvent = (
  tx: Prisma.TransactionClient,
  eventId: string,
): Promise<unknown> =>
  tx.$queryRaw`SELECT "id" FROM "event" WHERE "id" = ${eventId} FOR UPDATE`;

// Why the locked event takes no new people at `at`, or null while it is open.
// The service read the event before the lock; it may have been cancelled or
// started since.
const eventClosed = async (
  tx: Prisma.TransactionClient,
  eventId: string,
  at: Date,
): Promise<EventStateViolation | null> => {
  const event = await tx.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { status: true, startAt: true, endAt: true },
  });
  return eventStateViolation(event, at);
};

// Why the person cannot take a seat on the locked event, or null when they can.
const seatRefusal = async (
  tx: Prisma.TransactionClient,
  eventId: string,
  userId: string,
): Promise<Extract<JoinRuleViolation, 'EVENT_FULL' | 'HAS_SEAT'> | null> => {
  const event = await tx.event.findUniqueOrThrow({
    where: { id: eventId },
    select: {
      minParticipants: true,
      maxParticipants: true,
      externalOccupiedSpots: true,
      _count: {
        select: {
          participations: {
            where: { status: ParticipationStatus.APPROVED },
          },
        },
      },
    },
  });
  const seat = await tx.participation.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { status: true },
  });
  if (seat?.status === ParticipationStatus.APPROVED) return 'HAS_SEAT';
  const { freeSpots } = occupancyOf({
    minParticipants: event.minParticipants,
    maxParticipants: event.maxParticipants,
    externalOccupiedSpots: event.externalOccupiedSpots,
    approvedCount: event._count.participations,
  });
  return freeSpots <= 0 ? 'EVENT_FULL' : null;
};

// The roster holds a person once: an earlier row of theirs (waitlisted,
// invited, cancelled) becomes the seat. What a cancellation left goes with it:
// a new seat starts without the old message (ADR-0017).
const takeSeat = (
  tx: Prisma.TransactionClient,
  eventId: string,
  userId: string,
): Promise<unknown> =>
  tx.participation.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, status: ParticipationStatus.APPROVED },
    update: {
      status: ParticipationStatus.APPROVED,
      waitlistPosition: null,
      offerExpiresAt: null,
      cancelledAt: null,
      cancellationMessage: null,
    },
  });

@Injectable()
export class ParticipationRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Every request the person ever made on the event, newest first.
  async getRequestsOf(
    eventId: string,
    userId: string,
  ): Promise<ParticipationRequest[]> {
    const requests = await this.prisma.participationRequest.findMany({
      where: { eventId, userId },
      orderBy: { requestedAt: 'desc' },
    });
    return requests.map(mapToDomain);
  }

  // F-06.3, #177: one page of the events a person has applied to, narrowed by
  // the filter, with their own seat and requests on each. Hidden, non-public
  // and draft events are left out, as everywhere a person reaches an event.
  //
  // Waiting and approved applications to events that are still on come first,
  // soonest first; everything else (over, rejected, signed off, called off)
  // follows, latest first. Which is which mirrors `applicationStatusOf`: on a
  // published event, a seat or a waiting request makes it APPROVED or PENDING.
  // The database sorts, so offset paging stays stable across pages.
  async getApplicationFacts(
    userId: string,
    now: Date,
    { limit, offset }: Page,
    filter: EventFilter = NO_EVENT_FILTER,
  ): Promise<ApplicationFactsPage> {
    const ownRequest = (status?: RequestStatus): Prisma.Sql =>
      Prisma.sql`EXISTS (SELECT 1 FROM "participation_request" r
        WHERE r."eventId" = e."id" AND r."userId" = ${userId}
        ${status ? Prisma.sql`AND r."status"::text = ${status}` : Prisma.empty})`;
    const ownSeat = (statuses: ParticipationStatus[]): Prisma.Sql =>
      Prisma.sql`EXISTS (SELECT 1 FROM "participation" p
        WHERE p."eventId" = e."id" AND p."userId" = ${userId}
        AND p."status"::text IN (${Prisma.join(statuses)}))`;
    const storySeats = [
      ParticipationStatus.APPROVED,
      ParticipationStatus.CANCELLED,
    ];
    const where = allOf([
      Prisma.sql`e."status" IN ('PUBLISHED', 'CANCELLED', 'FINISHED')`,
      Prisma.sql`e."visibility" = 'PUBLIC'`,
      Prisma.sql`NOT e."isHidden"`,
      Prisma.sql`(${ownRequest()} OR ${ownSeat(storySeats)})`,
      ...eventFilterConditions(filter),
    ]);
    // An approved request without a seat row counts as the seat (ADR-0003).
    const isAhead = Prisma.sql`(e."status" = 'PUBLISHED' AND e."endAt" >= ${now} AND (
      ${ownSeat([ParticipationStatus.APPROVED])}
      OR ${ownRequest(RequestStatus.PENDING)}
      OR (${ownRequest(RequestStatus.APPROVED)} AND NOT ${ownSeat(storySeats)})))`;
    const [pageRows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT e."id" FROM "event" e
        JOIN "activity" a ON a."id" = e."activityId"
        WHERE ${where}
        ORDER BY ${aheadFirstOrder(isAhead)}
        LIMIT ${limit} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS "total" FROM "event" e
        JOIN "activity" a ON a."id" = e."activityId"
        WHERE ${where}`,
    ]);
    const ids = pageRows.map((row) => row.id);
    const events = await this.prisma.event.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        status: true,
        participations: { where: { userId }, select: { status: true } },
        participationRequests: {
          where: { userId },
          select: { status: true },
        },
      },
    });
    const byId = new Map(events.map((event) => [event.id, event]));
    return {
      items: ids.flatMap((id) => {
        const event = byId.get(id);
        if (!event) return [];
        const seat = event.participations[0]?.status;
        return [
          {
            eventId: event.id,
            // A finished event was on offer like a published one; that it is
            // over only decides its place in the list.
            eventStatus:
              event.status === EventStatus.CANCELLED
                ? 'CANCELLED'
                : 'PUBLISHED',
            seat:
              seat === ParticipationStatus.APPROVED ||
              seat === ParticipationStatus.CANCELLED
                ? seat
                : null,
            requests: event.participationRequests.map(
              (request) => request.status,
            ),
          },
        ];
      }),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async getRequest(
    eventId: string,
    requestId: string,
  ): Promise<ParticipationRequest | null> {
    const request = await this.prisma.participationRequest.findFirst({
      where: { id: requestId, eventId },
    });
    return request ? mapToDomain(request) : null;
  }

  // The person's seat on the event, or null when they never had one. Other
  // states (waitlisted, invited) have no feature behind them yet.
  async getSeatStatus(
    eventId: string,
    userId: string,
  ): Promise<SeatStatus | null> {
    const seat = await this.prisma.participation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    });
    return seat?.status === ParticipationStatus.APPROVED ||
      seat?.status === ParticipationStatus.CANCELLED
      ? seat.status
      : null;
  }

  async getApplicantProfile(userId: string): Promise<ApplicantProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: applicantSelect,
    });
    return mapApplicant(user);
  }

  // F-05.7: the requests waiting on the event, oldest first. Who asked first
  // is decided first, and the order stays put while the organizer pages on.
  async getPendingRequests(
    eventId: string,
    page: Page,
  ): Promise<PendingRequestPage> {
    const where = { eventId, status: RequestStatus.PENDING };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.participationRequest.findMany({
        where,
        orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
        skip: page.offset,
        take: page.limit,
        include: { user: { select: applicantSelect } },
      }),
      this.prisma.participationRequest.count({ where }),
    ]);
    return {
      items: requests.map(({ user, ...request }) => ({
        ...mapToDomain(request),
        applicant: mapApplicant(user),
      })),
      total,
    };
  }

  // F-05.6: the requests that ended without a seat, the latest change first.
  async getDecidedRequests(
    eventId: string,
    status: DecidedStatus,
    page: Page,
  ): Promise<DecidedRequestPage> {
    if (status === 'REJECTED') return this.getRejected(eventId, page);
    return this.getWithdrawn(eventId, page);
  }

  // F-05.6, F-06.4: one state of the participants tab, the latest change first.
  async getParticipants(
    eventId: string,
    status: SeatStatus,
    page: Page,
  ): Promise<ParticipantPage> {
    if (status === 'APPROVED') return this.getSeats(eventId, page);
    return this.getCancelledSeats(eventId, page);
  }

  // Everyone with a seat, so the list adds up to the approved count: a seat
  // added without a request (the demo data) is listed too, without a message.
  private async getSeats(
    eventId: string,
    page: Page,
  ): Promise<ParticipantPage> {
    const where = { eventId, status: ParticipationStatus.APPROVED };
    const [seats, total] = await this.prisma.$transaction([
      this.prisma.participation.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: page.offset,
        take: page.limit,
        select: {
          id: true,
          userId: true,
          updatedAt: true,
          user: { select: applicantSelect },
        },
      }),
      this.prisma.participation.count({ where }),
    ]);
    const requests = await this.prisma.participationRequest.findMany({
      where: {
        eventId,
        status: RequestStatus.APPROVED,
        userId: { in: seats.map((seat) => seat.userId) },
      },
      orderBy: { decidedAt: 'desc' },
      select: { userId: true, message: true },
    });
    const messages = new Map<string, string | null>();
    for (const request of requests) {
      if (!messages.has(request.userId)) {
        messages.set(request.userId, request.message);
      }
    }
    return {
      items: seats.map((seat) => ({
        id: seat.id,
        status: 'APPROVED',
        userId: seat.userId,
        message: messages.get(seat.userId) ?? null,
        changedAt: seat.updatedAt,
        asksAgain: false,
        person: mapApplicant(seat.user),
      })),
      total,
    };
  }

  // The people who gave their seat back (F-06.4), with their words to the
  // organizers. Someone who asked again since is still here: the request
  // waits on the requests tab, the seat stays given back until it is approved.
  private async getCancelledSeats(
    eventId: string,
    page: Page,
  ): Promise<ParticipantPage> {
    const where = { eventId, status: ParticipationStatus.CANCELLED };
    const [seats, total] = await this.prisma.$transaction([
      this.prisma.participation.findMany({
        where,
        orderBy: [{ cancelledAt: 'desc' }, { id: 'desc' }],
        skip: page.offset,
        take: page.limit,
        select: {
          id: true,
          userId: true,
          cancelledAt: true,
          updatedAt: true,
          cancellationMessage: true,
          user: { select: applicantSelect },
        },
      }),
      this.prisma.participation.count({ where }),
    ]);
    const asking = await this.prisma.participationRequest.findMany({
      where: {
        eventId,
        status: RequestStatus.PENDING,
        userId: { in: seats.map((seat) => seat.userId) },
      },
      select: { userId: true },
    });
    const askingIds = new Set(asking.map((request) => request.userId));
    return {
      items: seats.map((seat) => ({
        id: seat.id,
        status: 'CANCELLED',
        message: seat.cancellationMessage,
        changedAt: seat.cancelledAt ?? seat.updatedAt,
        asksAgain: askingIds.has(seat.userId),
        person: mapApplicant(seat.user),
      })),
      total,
    };
  }

  // A rejection is final for the event (ADR-0013): one per person.
  private async getRejected(
    eventId: string,
    page: Page,
  ): Promise<DecidedRequestPage> {
    const where = { eventId, status: RequestStatus.REJECTED };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.participationRequest.findMany({
        where,
        orderBy: [{ decidedAt: 'desc' }, { id: 'desc' }],
        skip: page.offset,
        take: page.limit,
        include: { user: { select: applicantSelect } },
      }),
      this.prisma.participationRequest.count({ where }),
    ]);
    return {
      items: requests.map((request) => ({
        id: request.id,
        status: 'REJECTED',
        userId: request.userId,
        message: request.message,
        changedAt: request.decidedAt ?? request.requestedAt,
        applicant: mapApplicant(request.user),
      })),
      total,
    };
  }

  // The people whose last word was taking their request back: once per
  // person, and not when they asked again, got a seat or were rejected since.
  private async getWithdrawn(
    eventId: string,
    page: Page,
  ): Promise<DecidedRequestPage> {
    const where = {
      eventId,
      status: RequestStatus.WITHDRAWN,
      user: {
        participationRequests: {
          none: {
            eventId,
            status: {
              in: [
                RequestStatus.PENDING,
                RequestStatus.APPROVED,
                RequestStatus.REJECTED,
              ],
            },
          },
        },
        participations: {
          none: { eventId, status: ParticipationStatus.APPROVED },
        },
      },
    } satisfies Prisma.ParticipationRequestWhereInput;
    const [requests, people] = await this.prisma.$transaction([
      this.prisma.participationRequest.findMany({
        where,
        orderBy: [{ decidedAt: 'desc' }, { id: 'desc' }],
        distinct: ['userId'],
        skip: page.offset,
        take: page.limit,
        include: { user: { select: applicantSelect } },
      }),
      this.prisma.participationRequest.findMany({
        where,
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);
    return {
      items: requests.map((request) => ({
        id: request.id,
        status: 'WITHDRAWN',
        userId: request.userId,
        message: request.message,
        changedAt: request.decidedAt ?? request.requestedAt,
        applicant: mapApplicant(request.user),
      })),
      total: people.length,
    };
  }

  // Null when the person already has a pending request on the event: the
  // partial unique index `participation_request_one_pending_key` settles two
  // requests sent at the same moment, which a read before the write cannot.
  // The event row is locked first, like in createApproved, so a request cannot
  // slip in after the event was cancelled or started; the reason comes back
  // instead of a request then.
  async createPending(data: {
    eventId: string;
    userId: string;
    message?: string;
    at: Date;
  }): Promise<ParticipationRequest | null | EventStateViolation> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockEvent(tx, data.eventId);
        const closed = await eventClosed(tx, data.eventId, data.at);
        if (closed) return closed;
        const request = await tx.participationRequest.create({
          data: {
            eventId: data.eventId,
            userId: data.userId,
            message: data.message ?? null,
            status: RequestStatus.PENDING,
          },
        });
        return mapToDomain(request);
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

  // F-05.5: the approved request and the seat it takes, in one transaction.
  // Returns the reason instead of a request when the seat went meanwhile, the
  // person got one in another window, or the event closed (cancelled, started)
  // since the service read it.
  async createApproved(data: {
    eventId: string;
    userId: string;
    message?: string;
    at: Date;
  }): Promise<
    | ParticipationRequest
    | Extract<JoinRuleViolation, 'EVENT_FULL' | 'HAS_SEAT'>
    | EventStateViolation
  > {
    return this.prisma.$transaction(async (tx) => {
      await lockEvent(tx, data.eventId);
      const closed = await eventClosed(tx, data.eventId, data.at);
      if (closed) return closed;
      const refusal = await seatRefusal(tx, data.eventId, data.userId);
      if (refusal) return refusal;

      const request = await tx.participationRequest.create({
        data: {
          eventId: data.eventId,
          userId: data.userId,
          message: data.message ?? null,
          status: RequestStatus.APPROVED,
          requestedAt: data.at,
          decidedAt: data.at,
        },
      });
      await takeSeat(tx, data.eventId, data.userId);
      return mapToDomain(request);
    });
  }

  // F-05.7: the organizer's approval and the seat it takes, in one transaction
  // under the same lock as `createApproved`. Returns the reason instead of the
  // request when it stopped waiting, the seat went meanwhile, or the applicant
  // already has one.
  async approvePending(data: {
    eventId: string;
    requestId: string;
    at: Date;
  }): Promise<
    | ParticipationRequest
    | Extract<
        DecisionRuleViolation,
        | 'EVENT_FULL'
        | 'NOT_PENDING'
        | 'APPLICANT_HAS_SEAT'
        | EventStateViolation
      >
  > {
    return this.prisma.$transaction(async (tx) => {
      await lockEvent(tx, data.eventId);
      const closed = await eventClosed(tx, data.eventId, data.at);
      if (closed) return closed;
      const request = await tx.participationRequest.findFirst({
        where: { id: data.requestId, eventId: data.eventId },
      });
      if (request?.status !== RequestStatus.PENDING) return 'NOT_PENDING';
      const refusal = await seatRefusal(tx, data.eventId, request.userId);
      if (refusal === 'HAS_SEAT') return 'APPLICANT_HAS_SEAT';
      if (refusal) return refusal;

      // Withdrawing takes no lock on the event, so the request may have
      // stopped waiting since the read above.
      const { count } = await tx.participationRequest.updateMany({
        where: { id: request.id, status: RequestStatus.PENDING },
        data: { status: RequestStatus.APPROVED, decidedAt: data.at },
      });
      if (count === 0) return 'NOT_PENDING';
      await takeSeat(tx, data.eventId, request.userId);
      return mapToDomain({
        ...request,
        status: RequestStatus.APPROVED,
        decidedAt: data.at,
      });
    });
  }

  // F-05.7: null when the request no longer waits, withdrawn or decided by
  // someone else meanwhile. A rejection takes no seat, so it needs no lock.
  async rejectPending(data: {
    eventId: string;
    requestId: string;
    reason?: string;
    at: Date;
  }): Promise<ParticipationRequest | null> {
    const { count } = await this.prisma.participationRequest.updateMany({
      where: {
        id: data.requestId,
        eventId: data.eventId,
        status: RequestStatus.PENDING,
      },
      data: {
        status: RequestStatus.REJECTED,
        decidedAt: data.at,
        rejectionReason: data.reason ?? null,
      },
    });
    if (count === 0) return null;
    const request = await this.prisma.participationRequest.findUniqueOrThrow({
      where: { id: data.requestId },
    });
    return mapToDomain(request);
  }

  // False when there was no pending request to withdraw.
  async withdrawPending(
    eventId: string,
    userId: string,
    at: Date,
  ): Promise<boolean> {
    const { count } = await this.prisma.participationRequest.updateMany({
      where: { eventId, userId, status: RequestStatus.PENDING },
      data: { status: RequestStatus.WITHDRAWN, decidedAt: at },
    });
    return count > 0;
  }

  // F-06.4: the participant gives the seat back, with their message to the
  // organizers. Under the event lock like taking a seat, so it cannot slip in
  // after the event started or was cancelled; returns the reason then, or
  // NO_SEAT when there was no seat to give back. Null once it is cancelled.
  async cancelSeat(data: {
    eventId: string;
    userId: string;
    message: string;
    at: Date;
  }): Promise<CancelRuleViolation | null> {
    return this.prisma.$transaction(async (tx) => {
      await lockEvent(tx, data.eventId);
      const closed = await eventClosed(tx, data.eventId, data.at);
      if (closed) return closed;
      const { count } = await tx.participation.updateMany({
        where: {
          eventId: data.eventId,
          userId: data.userId,
          status: ParticipationStatus.APPROVED,
        },
        data: {
          status: ParticipationStatus.CANCELLED,
          cancelledAt: data.at,
          cancellationMessage: data.message,
        },
      });
      return count === 0 ? 'NO_SEAT' : null;
    });
  }
}
