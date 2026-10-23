import { PrismaService } from '@/core/prisma/prisma.service';
import {
  Prisma,
  ParticipationRequest as PrismaParticipationRequest,
  RequestStatus,
} from '@/generated/prisma/client';
import { ParticipationRequest } from '@/modules/participation-request/domain/participation-request';
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
