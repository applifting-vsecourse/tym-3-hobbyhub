import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ParticipationStatus,
  Prisma,
  ParticipationRequest as PrismaParticipationRequest,
  RequestStatus,
} from '@/generated/prisma/client';
import { occupancyOf, Page } from '@/modules/event/domain/event';
import {
  ApplicantProfile,
  DecisionRuleViolation,
  JoinRuleViolation,
  ParticipationRequest,
  PendingRequestPage,
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
// invited, cancelled) becomes the seat.
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

  async getRequest(
    eventId: string,
    requestId: string,
  ): Promise<ParticipationRequest | null> {
    const request = await this.prisma.participationRequest.findFirst({
      where: { id: requestId, eventId },
    });
    return request ? mapToDomain(request) : null;
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

  // Null when the person already has a pending request on the event: the
  // partial unique index `participation_request_one_pending_key` settles two
  // requests sent at the same moment, which a read before the write cannot.
  async createPending(data: {
    eventId: string;
    userId: string;
    message?: string;
  }): Promise<ParticipationRequest | null> {
    try {
      const request = await this.prisma.participationRequest.create({
        data: {
          eventId: data.eventId,
          userId: data.userId,
          message: data.message ?? null,
          status: RequestStatus.PENDING,
        },
      });
      return mapToDomain(request);
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
  // Returns the reason instead of a request when the seat went meanwhile, or
  // the person got one in another window.
  async createApproved(data: {
    eventId: string;
    userId: string;
    message?: string;
    at: Date;
  }): Promise<
    ParticipationRequest | Extract<JoinRuleViolation, 'EVENT_FULL' | 'HAS_SEAT'>
  > {
    return this.prisma.$transaction(async (tx) => {
      await lockEvent(tx, data.eventId);
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
        'EVENT_FULL' | 'NOT_PENDING' | 'APPLICANT_HAS_SEAT'
      >
  > {
    return this.prisma.$transaction(async (tx) => {
      await lockEvent(tx, data.eventId);
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
}
