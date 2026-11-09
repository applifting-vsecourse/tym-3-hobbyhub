import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GroupRole,
  GroupStatus,
  Prisma,
  MembershipRequest as PrismaMembershipRequest,
  RequestStatus,
} from '@/generated/prisma/client';
import {
  ApplicantProfile,
  MembershipDecisionViolation,
  MembershipRequest,
  MyMembershipRequestPage,
  MyMembershipRequestSection,
  PendingMembershipRequest,
} from '@/modules/membership-request/domain/membership-request';
import { Injectable } from '@nestjs/common';

const mapToDomain = (request: PrismaMembershipRequest): MembershipRequest => ({
  id: request.id,
  groupId: request.groupId,
  userId: request.userId,
  status: request.status,
  message: request.message,
  requestedAt: request.requestedAt,
  decidedAt: request.decidedAt,
  decisionMessage: request.decisionMessage,
});

// All the admins may see of the person asking; the rest of the row stays here.
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

// The sections of the overview (F-07.7). A waiting request on a cancelled
// group is history: no admin can decide it any more.
const sectionWhere: Record<
  MyMembershipRequestSection,
  Prisma.MembershipRequestWhereInput
> = {
  pending: {
    status: RequestStatus.PENDING,
    group: { status: GroupStatus.ACTIVE },
  },
  history: {
    OR: [
      {
        status: {
          in: [
            RequestStatus.REJECTED,
            RequestStatus.WITHDRAWN,
            RequestStatus.CLOSED,
          ],
        },
      },
      {
        status: RequestStatus.PENDING,
        group: { status: GroupStatus.CANCELLED },
      },
    ],
  },
};

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

@Injectable()
export class MembershipRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Every request the person ever made on the group, newest first.
  async getRequestsOf(
    groupId: string,
    userId: string,
  ): Promise<MembershipRequest[]> {
    const requests = await this.prisma.membershipRequest.findMany({
      where: { groupId, userId },
      orderBy: { requestedAt: 'desc' },
    });
    return requests.map(mapToDomain);
  }

  // F-07.7: a page of one section of the person's requests across groups,
  // newest first; the id breaks ties so cursor pages never skip or repeat.
  async listRequestsOfUser(
    userId: string,
    section: MyMembershipRequestSection,
    pageSize: number,
    cursor?: string,
  ): Promise<MyMembershipRequestPage> {
    const requests = await this.prisma.membershipRequest.findMany({
      where: { userId, ...sectionWhere[section] },
      include: {
        group: {
          select: { id: true, name: true, visibility: true, status: true },
        },
      },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      // One extra row tells whether another page exists.
      take: pageSize + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const items = requests
      .slice(0, pageSize)
      .map(({ group, ...request }) => ({ ...mapToDomain(request), group }));
    return {
      items,
      nextCursor:
        requests.length > pageSize ? items[items.length - 1].id : null,
    };
  }

  async getRequest(
    groupId: string,
    requestId: string,
  ): Promise<MembershipRequest | null> {
    const request = await this.prisma.membershipRequest.findFirst({
      where: { id: requestId, groupId },
    });
    return request ? mapToDomain(request) : null;
  }

  // What the admins will see of the person, so the request form can show it.
  async getApplicantProfile(userId: string): Promise<ApplicantProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: applicantSelect,
    });
    return mapApplicant(user);
  }

  // The requests waiting on the group, oldest first, so none is forgotten.
  async getPendingRequests(
    groupId: string,
  ): Promise<PendingMembershipRequest[]> {
    const requests = await this.prisma.membershipRequest.findMany({
      where: { groupId, status: RequestStatus.PENDING },
      include: { user: { select: applicantSelect } },
      orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
    });
    return requests.map(({ user, ...request }) => ({
      ...mapToDomain(request),
      applicant: mapApplicant(user),
    }));
  }

  // Null when the person already has a pending request on the group: the
  // partial unique index `membership_request_one_pending_key` settles two
  // requests sent at the same moment, which a read before the write cannot.
  async createPending(data: {
    groupId: string;
    userId: string;
    message?: string;
  }): Promise<MembershipRequest | null> {
    try {
      const request = await this.prisma.membershipRequest.create({
        data: {
          groupId: data.groupId,
          userId: data.userId,
          message: data.message ?? null,
          status: RequestStatus.PENDING,
        },
      });
      return mapToDomain(request);
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  // False when there was no pending request to withdraw.
  async withdrawPending(
    groupId: string,
    userId: string,
    at: Date,
  ): Promise<boolean> {
    const { count } = await this.prisma.membershipRequest.updateMany({
      where: { groupId, userId, status: RequestStatus.PENDING },
      data: { status: RequestStatus.WITHDRAWN, decidedAt: at },
    });
    return count > 0;
  }

  // F-07.3: the approval and the membership it creates, in one transaction.
  // The write is conditional, so a withdrawal or another admin's decision in
  // the meantime returns NOT_PENDING instead of a second decision. Returns
  // APPLICANT_IS_MEMBER when the person is in the group already; the
  // membership's unique key rolls the approval back.
  async approvePending(data: {
    groupId: string;
    requestId: string;
    message?: string;
    at: Date;
  }): Promise<
    | MembershipRequest
    | Extract<
        MembershipDecisionViolation,
        'NOT_PENDING' | 'APPLICANT_IS_MEMBER'
      >
  > {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.membershipRequest.findFirst({
          where: { id: data.requestId, groupId: data.groupId },
        });
        if (request?.status !== RequestStatus.PENDING) return 'NOT_PENDING';
        const { count } = await tx.membershipRequest.updateMany({
          where: { id: request.id, status: RequestStatus.PENDING },
          data: {
            status: RequestStatus.APPROVED,
            decidedAt: data.at,
            decisionMessage: data.message ?? null,
          },
        });
        if (count === 0) return 'NOT_PENDING';
        await tx.groupMembership.create({
          data: {
            groupId: data.groupId,
            userId: request.userId,
            role: GroupRole.MEMBER,
            joinedAt: data.at,
          },
        });
        return mapToDomain({
          ...request,
          status: RequestStatus.APPROVED,
          decidedAt: data.at,
          decisionMessage: data.message ?? null,
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) return 'APPLICANT_IS_MEMBER';
      throw error;
    }
  }

  // F-07.3: null when the request no longer waits, withdrawn or decided by
  // someone else meanwhile.
  async rejectPending(data: {
    groupId: string;
    requestId: string;
    message?: string;
    at: Date;
  }): Promise<MembershipRequest | null> {
    const { count } = await this.prisma.membershipRequest.updateMany({
      where: {
        id: data.requestId,
        groupId: data.groupId,
        status: RequestStatus.PENDING,
      },
      data: {
        status: RequestStatus.REJECTED,
        decidedAt: data.at,
        decisionMessage: data.message ?? null,
      },
    });
    if (count === 0) return null;
    const request = await this.prisma.membershipRequest.findUniqueOrThrow({
      where: { id: data.requestId },
    });
    return mapToDomain(request);
  }
}
