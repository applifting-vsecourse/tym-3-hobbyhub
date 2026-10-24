import { EventSeatFacts } from '@/modules/event/domain/event';

// Same limits as the columns `participation_request.message` and
// `participation_request.rejectionReason`.
export const PARTICIPATION_REQUEST_MESSAGE_MAX_LENGTH = 500;
export const PARTICIPATION_REQUEST_REJECTION_REASON_MAX_LENGTH = 500;

// The organizer's list of waiting requests (F-05.7) pages like the event list.
export const PENDING_REQUESTS_DEFAULT_LIMIT = 20;
export const PENDING_REQUESTS_MAX_LIMIT = 50;

// ADR-0003, ADR-0008. PENDING waits for the organizer (F-05.7); APPROVED holds
// a seat, approved by the organizer or at once on an event with automatic
// approval (F-05.5); WITHDRAWN was cancelled by the applicant; CLOSED ended
// without a decision because the event was cancelled.
export type RequestStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'CLOSED';

export type ParticipationRequest = {
  id: string;
  eventId: string;
  userId: string;
  status: RequestStatus;
  message: string | null;
  requestedAt: Date;
  // When it stopped being PENDING, by anyone's hand.
  decidedAt: Date | null;
  // Optional, only on a rejection (ADR-0008). Nobody sees it in the app yet.
  rejectionReason: string | null;
};

// What the organizer sees of the person asking (F-05.7): no birth date,
// gender, contact or place. The request form shows the applicant exactly this.
export type ApplicantProfile = {
  name: string;
  image: string | null;
  bio: string | null;
  hasVerifiedEmail: boolean;
};

export type PendingRequest = ParticipationRequest & {
  applicant: ApplicantProfile;
};

export type PendingRequestPage = { items: PendingRequest[]; total: number };

// Why a person cannot ask to join an event now. The client shows the same
// reasons before sending; the server is the one that counts.
export type JoinRuleViolation =
  | 'EVENT_CANCELLED'
  | 'EVENT_NOT_HELD'
  | 'EVENT_FINISHED'
  | 'EVENT_STARTED'
  | 'EVENT_FULL'
  | 'IS_ORGANIZER'
  | 'HAS_SEAT'
  | 'ALREADY_REQUESTED'
  | 'REJECTED_BEFORE';

type EventStateViolation =
  'EVENT_CANCELLED' | 'EVENT_NOT_HELD' | 'EVENT_FINISHED' | 'EVENT_STARTED';

// Why the organizer cannot decide a request now (F-05.7). APPLICANT_HAS_SEAT
// shows only once the seat is taken, so the repository reports it.
export type DecisionRuleViolation =
  EventStateViolation | 'EVENT_FULL' | 'NOT_PENDING' | 'APPLICANT_HAS_SEAT';

export type Decision = 'APPROVE' | 'REJECT';

// The states the event detail tells apart, decided the same way. Null while
// the event is still ahead.
const eventStateViolation = (
  event: Pick<EventSeatFacts, 'status' | 'startAt' | 'endAt'>,
  now: Date,
): EventStateViolation | null => {
  if (event.status === 'CANCELLED') return 'EVENT_CANCELLED';
  if (event.status === 'NOT_HELD') return 'EVENT_NOT_HELD';
  if (event.status !== 'PUBLISHED' || event.endAt.getTime() < now.getTime()) {
    return 'EVENT_FINISHED';
  }
  if (event.startAt.getTime() <= now.getTime()) return 'EVENT_STARTED';
  return null;
};

// The request a person sees on an event: the one still waiting, otherwise the
// last decision. Withdrawn and closed requests are history and leave the person
// free to ask again.
export const currentRequestOf = (
  requests: ParticipationRequest[],
): ParticipationRequest | null => {
  const latestWith = (
    status: RequestStatus,
  ): ParticipationRequest | undefined =>
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

// F-06.1: who may ask to join, given the event and the applicant's own
// requests on it. A pending request takes no seat, so a full event refuses new
// requests but keeps the ones already waiting. A rejection is final for the
// event (ADR-0013).
export const joinRuleViolations = (
  event: EventSeatFacts,
  applicantId: string,
  requests: Pick<ParticipationRequest, 'status'>[],
  now: Date,
): JoinRuleViolation[] => {
  const violations: JoinRuleViolation[] = [];
  const state = eventStateViolation(event, now);
  if (state) {
    violations.push(state);
  }
  if (event.organizerIds.includes(applicantId)) {
    violations.push('IS_ORGANIZER');
  }
  if (event.hasSeat) {
    violations.push('HAS_SEAT');
  }
  if (requests.some((request) => request.status === 'PENDING')) {
    violations.push('ALREADY_REQUESTED');
  }
  if (requests.some((request) => request.status === 'REJECTED')) {
    violations.push('REJECTED_BEFORE');
  }
  if (event.freeSpots <= 0) {
    violations.push('EVENT_FULL');
  }
  return violations;
};

// F-05.7: whether the organizer may decide the request now. Requests are
// decided until the event starts, the boundary of asking too. Approval takes a
// seat, so a full event can only reject.
export const decisionRuleViolations = (
  event: Pick<EventSeatFacts, 'status' | 'startAt' | 'endAt' | 'freeSpots'>,
  request: Pick<ParticipationRequest, 'status'>,
  decision: Decision,
  now: Date,
): DecisionRuleViolation[] => {
  const violations: DecisionRuleViolation[] = [];
  const state = eventStateViolation(event, now);
  if (state) {
    violations.push(state);
  }
  if (request.status !== 'PENDING') {
    violations.push('NOT_PENDING');
  }
  if (decision === 'APPROVE' && event.freeSpots <= 0) {
    violations.push('EVENT_FULL');
  }
  return violations;
};
