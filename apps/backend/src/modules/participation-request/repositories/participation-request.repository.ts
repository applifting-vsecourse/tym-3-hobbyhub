import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ParticipationStatus,
  Prisma,
  ParticipationRequest as PrismaParticipationRequest,
  RequestStatus,
} from '@/generated/prisma/client';
import { occupancyOf } from '@/modules/event/domain/event';
import {
  JoinRuleViolation,
  ParticipationRequest,
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
  // The event row is locked first, so two people taking the last seat at the
  // same moment queue up and the second one finds it gone, which the service's
  // read before the write cannot settle. Returns the reason instead of a
  // request when the seat went meanwhile, or the person got one in another
  // window.
  async createApproved(data: {
    eventId: string;
    userId: string;
    message?: string;
    at: Date;
  }): Promise<
    ParticipationRequest | Extract<JoinRuleViolation, 'EVENT_FULL' | 'HAS_SEAT'>
  > {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "event" WHERE "id" = ${data.eventId} FOR UPDATE`;
      const event = await tx.event.findUniqueOrThrow({
        where: { id: data.eventId },
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
        where: {
          eventId_userId: { eventId: data.eventId, userId: data.userId },
        },
        select: { status: true },
      });
      if (seat?.status === ParticipationStatus.APPROVED) return 'HAS_SEAT';
      const { freeSpots } = occupancyOf({
        minParticipants: event.minParticipants,
        maxParticipants: event.maxParticipants,
        externalOccupiedSpots: event.externalOccupiedSpots,
        approvedCount: event._count.participations,
      });
      if (freeSpots <= 0) return 'EVENT_FULL';

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
      // The roster holds a person once: an earlier row of theirs (waitlisted,
      // invited, cancelled) becomes the seat.
      await tx.participation.upsert({
        where: {
          eventId_userId: { eventId: data.eventId, userId: data.userId },
        },
        create: {
          eventId: data.eventId,
          userId: data.userId,
          status: ParticipationStatus.APPROVED,
        },
        update: {
          status: ParticipationStatus.APPROVED,
          waitlistPosition: null,
          offerExpiresAt: null,
          cancelledAt: null,
        },
      });
      return mapToDomain(request);
    });
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
