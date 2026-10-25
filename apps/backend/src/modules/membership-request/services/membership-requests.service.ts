import { Group } from '@/modules/group/domain/group';
import { GroupsService } from '@/modules/group/services/groups.service';
import {
  currentMembershipRequestOf,
  MembershipDecisionViolation,
  membershipDecisionViolations,
  MembershipRequest,
  MembershipRuleViolation,
  membershipRuleViolations,
  PendingMembershipRequest,
} from '@/modules/membership-request/domain/membership-request';
import { MembershipRequestRepository } from '@/modules/membership-request/repositories/membership-request.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const VIOLATION_MESSAGES: Record<
  MembershipRuleViolation | MembershipDecisionViolation,
  string
> = {
  IS_MEMBER: 'You are already a member of this group',
  ALREADY_REQUESTED: 'You have already asked to join this group',
  REJECTED_BEFORE: 'Your request to join this group was rejected',
  GROUP_CANCELLED: 'The group was cancelled',
  NOT_PENDING: 'The request no longer waits for a decision',
  APPLICANT_IS_MEMBER: 'The applicant is already a member of this group',
};

// Messages plus the codes, so the client can say why in its language.
const violationsError = (
  violations: (MembershipRuleViolation | MembershipDecisionViolation)[],
): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: violations.map((violation) => VIOLATION_MESSAGES[violation]),
    violations,
  });

// What the signed-in person sees in the membership panel of a group.
export type MyMembershipRequestState = {
  request: MembershipRequest | null;
  // Empty when they may ask to join now.
  violations: MembershipRuleViolation[];
};

@Injectable()
export class MembershipRequestsService {
  constructor(
    private readonly repository: MembershipRequestRepository,
    private readonly groupsService: GroupsService,
  ) {}

  async getMyRequestState(
    user: Identity,
    groupId: string,
  ): Promise<MyMembershipRequestState> {
    await this.groupsService.getPublicGroup(groupId);
    const [role, requests] = await Promise.all([
      this.groupsService.getMemberRole(groupId, user.id),
      this.repository.getRequestsOf(groupId, user.id),
    ]);
    return {
      request: currentMembershipRequestOf(requests),
      violations: membershipRuleViolations(role, requests),
    };
  }

  // F-07.3: a request waits for the group's admins; automatic approval is
  // F-05.5. Only a public, active group can be asked to join (else 404).
  async requestMembership(
    user: Identity,
    groupId: string,
    message?: string,
  ): Promise<MembershipRequest> {
    await this.groupsService.getPublicGroup(groupId);
    const [role, requests] = await Promise.all([
      this.groupsService.getMemberRole(groupId, user.id),
      this.repository.getRequestsOf(groupId, user.id),
    ]);
    const violations = membershipRuleViolations(role, requests);
    if (violations.length > 0) throw violationsError(violations);

    // The applicant comes from the session, never from the request body.
    const request = await this.repository.createPending({
      groupId,
      userId: user.id,
      message,
    });
    if (!request) throw violationsError(['ALREADY_REQUESTED']);
    return request;
  }

  // Needs no look at the group: a pending request can be taken back even once
  // the group is cancelled.
  async withdrawMyRequest(
    user: Identity,
    groupId: string,
    now: Date = new Date(),
  ): Promise<void> {
    const withdrawn = await this.repository.withdrawPending(
      groupId,
      user.id,
      now,
    );
    if (!withdrawn)
      throw new NotFoundException('No pending request to withdraw');
  }

  // F-07.3: the requests waiting on the group, for its admins.
  async getPendingRequests(
    user: Identity,
    groupId: string,
  ): Promise<PendingMembershipRequest[]> {
    await this.groupsService.getManagedGroup(groupId, user);
    return this.repository.getPendingRequests(groupId);
  }

  // F-07.3: the applicant becomes a member and counts towards the group.
  async approveRequest(
    user: Identity,
    groupId: string,
    requestId: string,
    now: Date = new Date(),
  ): Promise<MembershipRequest> {
    const { group, request } = await this.getDecidable(
      user,
      groupId,
      requestId,
    );
    const violations = membershipDecisionViolations(group, request);
    if (violations.length > 0) throw violationsError(violations);

    const approved = await this.repository.approvePending({
      groupId,
      requestId,
      at: now,
    });
    if (typeof approved === 'string') throw violationsError([approved]);
    return approved;
  }

  // F-07.3. Final for the group (ADR-0014); the reason is kept for the
  // applicant's overview (F-07.7 #52), not shown yet.
  async rejectRequest(
    user: Identity,
    groupId: string,
    requestId: string,
    reason?: string,
    now: Date = new Date(),
  ): Promise<MembershipRequest> {
    const { group, request } = await this.getDecidable(
      user,
      groupId,
      requestId,
    );
    const violations = membershipDecisionViolations(group, request);
    if (violations.length > 0) throw violationsError(violations);

    const rejected = await this.repository.rejectPending({
      groupId,
      requestId,
      reason,
      at: now,
    });
    if (!rejected) throw violationsError(['NOT_PENDING']);
    return rejected;
  }

  private async getDecidable(
    user: Identity,
    groupId: string,
    requestId: string,
  ): Promise<{ group: Group; request: MembershipRequest }> {
    // The group module decides who manages it, and answers 404 to the rest.
    const group = await this.groupsService.getManagedGroup(groupId, user);
    const request = await this.repository.getRequest(groupId, requestId);
    if (!request) throw new NotFoundException('Request not found');
    return { group, request };
  }
}
