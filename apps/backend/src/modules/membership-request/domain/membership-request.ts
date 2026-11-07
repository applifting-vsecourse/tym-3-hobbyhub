import { Group, GroupRole } from '@/modules/group/domain/group';
import { RequestStatus } from '@/modules/participation-request/domain/participation-request';

// Same limits as the columns `membership_request.message` and
// `membership_request.rejectionReason`.
export const MEMBERSHIP_REQUEST_MESSAGE_MAX_LENGTH = 500;
export const MEMBERSHIP_REQUEST_REJECTION_REASON_MAX_LENGTH = 500;

// F-07.3, ADR-0008: the same life cycle as a request to join an event.
// PENDING waits for the group's admins; APPROVED made the person a member;
// REJECTED is final for the group (ADR-0014); WITHDRAWN was taken back by the
// applicant. CLOSED is not used for groups yet.
export type MembershipRequest = {
  id: string;
  groupId: string;
  userId: string;
  status: RequestStatus;
  message: string | null;
  requestedAt: Date;
  // When it stopped being PENDING, by anyone's hand.
  decidedAt: Date | null;
  // Optional, only on a rejection (ADR-0008). Only the applicant sees it, in
  // their overview (F-07.7).
  rejectionReason: string | null;
};

// F-07.7: the overview of a person's own requests, newest first.
export const MY_MEMBERSHIP_REQUESTS_PAGE_SIZE = 20;

// The overview's two sections, each paged on its own. `pending`: requests the
// group's admins can still decide. `history`: the rest except approvals, which
// "Moje skupiny" shows as memberships; that includes a waiting request on a
// cancelled group (GROUP_CANCELLED below).
export const MY_MEMBERSHIP_REQUEST_SECTIONS = ['pending', 'history'] as const;
export type MyMembershipRequestSection =
  (typeof MY_MEMBERSHIP_REQUEST_SECTIONS)[number];

// A request in the applicant's overview, with the group it was for.
export type MyMembershipRequest = MembershipRequest & {
  group: Pick<Group, 'id' | 'name' | 'visibility' | 'status'>;
};

export type MyMembershipRequestPage = {
  items: MyMembershipRequest[];
  nextCursor: string | null;
};

// What the overview says about a request: its status, or GROUP_CANCELLED for
// a waiting request on a cancelled group, which no admin can decide any more.
// The row stays PENDING; CLOSED is not used for groups (ADR-0008).
export type MyMembershipRequestStatus = RequestStatus | 'GROUP_CANCELLED';

export const myMembershipRequestStatusOf = (
  request: Pick<MyMembershipRequest, 'status' | 'group'>,
): MyMembershipRequestStatus =>
  request.status === 'PENDING' && request.group.status === 'CANCELLED'
    ? 'GROUP_CANCELLED'
    : request.status;

// What the admins see of the person asking: no birth year, gender, contact or
// place. The same as an organizer sees of an applicant to an event.
export type ApplicantProfile = {
  name: string;
  image: string | null;
  bio: string | null;
  hasVerifiedEmail: boolean;
};

export type PendingMembershipRequest = MembershipRequest & {
  applicant: ApplicantProfile;
};

// Why a person cannot ask to join a group now. The client shows the same
// reasons before sending; the server is the one that counts. A group that is
// not public and active is "not found" instead, as on its detail.
export type MembershipRuleViolation =
  'IS_MEMBER' | 'ALREADY_REQUESTED' | 'REJECTED_BEFORE';

// Why an admin cannot decide a request now. APPLICANT_IS_MEMBER shows only
// once the membership exists, so the repository reports it.
export type MembershipDecisionViolation =
  'GROUP_CANCELLED' | 'NOT_PENDING' | 'APPLICANT_IS_MEMBER';

// The request a person sees on a group: the one still waiting, otherwise the
// last decision. Withdrawn requests are history and leave the person free to
// ask again.
export const currentMembershipRequestOf = (
  requests: MembershipRequest[],
): MembershipRequest | null => {
  const latestWith = (status: RequestStatus): MembershipRequest | undefined =>
    requests
      .filter((request) => request.status === status)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())[0];
  return (
    latestWith('PENDING') ??
    latestWith('APPROVED') ??
    latestWith('REJECTED') ??
    null
  );
};

// F-07.3: who may ask to join, given their role in the group (null when they
// are not in it) and their own requests on it. A rejection is final for the
// group (ADR-0014).
export const membershipRuleViolations = (
  applicantRole: GroupRole | null,
  requests: Pick<MembershipRequest, 'status'>[],
): MembershipRuleViolation[] => {
  const violations: MembershipRuleViolation[] = [];
  if (applicantRole !== null) {
    violations.push('IS_MEMBER');
  }
  if (requests.some((request) => request.status === 'PENDING')) {
    violations.push('ALREADY_REQUESTED');
  }
  if (requests.some((request) => request.status === 'REJECTED')) {
    violations.push('REJECTED_BEFORE');
  }
  return violations;
};

// F-07.3: whether an admin may decide the request now. A cancelled group
// takes no new members, so its waiting requests stay undecided.
export const membershipDecisionViolations = (
  group: Pick<Group, 'status'>,
  request: Pick<MembershipRequest, 'status'>,
): MembershipDecisionViolation[] => {
  const violations: MembershipDecisionViolation[] = [];
  if (group.status === 'CANCELLED') {
    violations.push('GROUP_CANCELLED');
  }
  if (request.status !== 'PENDING') {
    violations.push('NOT_PENDING');
  }
  return violations;
};
