import { EventSeatFacts } from '@/modules/event/domain/event';

// Same limit as the column `participation_request.message`.
export const PARTICIPATION_REQUEST_MESSAGE_MAX_LENGTH = 500;

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
};

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
  // The states the event detail tells apart, decided the same way.
  if (event.status === 'CANCELLED') {
    violations.push('EVENT_CANCELLED');
  } else if (event.status === 'NOT_HELD') {
    violations.push('EVENT_NOT_HELD');
  } else if (
    event.status !== 'PUBLISHED' ||
    event.endAt.getTime() < now.getTime()
  ) {
    violations.push('EVENT_FINISHED');
  } else if (event.startAt.getTime() <= now.getTime()) {
    violations.push('EVENT_STARTED');
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
