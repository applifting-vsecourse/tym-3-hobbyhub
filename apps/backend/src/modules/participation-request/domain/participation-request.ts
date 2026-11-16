import {
  EventFacts,
  EventSeatFacts,
  isOrganizerOf,
} from '@/modules/event/domain/event';

// Same limits as the columns `participation_request.message` and
// `participation_request.decisionMessage`.
export const PARTICIPATION_REQUEST_MESSAGE_MAX_LENGTH = 500;
export const PARTICIPATION_REQUEST_DECISION_MESSAGE_MAX_LENGTH = 500;

// F-06.4, ADR-0017: the participant's required words to the organizers when
// cancelling a seat. Same limits as the column and CHECK constraints of
// `participation.cancellationMessage`.
export const PARTICIPATION_CANCELLATION_MESSAGE_MIN_LENGTH = 10;
export const PARTICIPATION_CANCELLATION_MESSAGE_MAX_LENGTH = 500;

// The organizer's list of waiting requests (F-05.7) pages like the event list.
export const PENDING_REQUESTS_DEFAULT_LIMIT = 20;
export const PENDING_REQUESTS_MAX_LIMIT = 50;

// ADR-0003, ADR-0008. PENDING waits for the organizer (F-05.7); APPROVED holds
// a seat, approved by the organizer or at once on an event with automatic
// approval (F-05.5); WITHDRAWN was cancelled by the applicant; CLOSED ended
// without a decision because the event was cancelled.
export type RequestStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'CLOSED';

// The person's own seat on an event (ADR-0003). Only the two states a seat
// reached through a request can be in today; the rest come with their features.
export type SeatStatus = 'APPROVED' | 'CANCELLED';

export type ParticipationRequest = {
  id: string;
  eventId: string;
  userId: string;
  status: RequestStatus;
  message: string | null;
  requestedAt: Date;
  // When it stopped being PENDING, by anyone's hand.
  decidedAt: Date | null;
  // The organizer's optional words with an approval or a rejection (#153,
  // ADR-0019). The applicant sees them on the event, and in the notification.
  decisionMessage: string | null;
};

// What the organizer sees of the person asking (F-05.7): no birth year,
// gender, contact or place. The request form shows the applicant exactly this.
export type ApplicantProfile = {
  name: string;
  image: string | null;
  bio: string | null;
  hasVerifiedEmail: boolean;
};

// F-04.2: a person holding an approved seat, as the organizer's list shows it.

export type PendingRequest = ParticipationRequest & {
  applicant: ApplicantProfile;
};

export type PendingRequestPage = { items: PendingRequest[]; total: number };

// F-05.6: the requests that ended without a seat, under the waiting ones on
// the organizer's requests tab. WITHDRAWN are the people who took their
// request back and asked no more. An approved request is no request to show:
// its person is on the participants tab. CLOSED stays out: it only follows a
// cancelled event.
export const DECIDED_STATUSES = ['REJECTED', 'WITHDRAWN'] as const;
export type DecidedStatus = (typeof DECIDED_STATUSES)[number];

export type DecidedRequest = {
  id: string;
  status: DecidedStatus;
  // The applicant, for the link to their profile.
  userId: string;
  message: string | null;
  // When the person was rejected or withdrew.
  changedAt: Date;
  applicant: ApplicantProfile;
};

export type DecidedRequestPage = { items: DecidedRequest[]; total: number };

// F-05.6, F-06.4: the organizer's participants tab, about seats only
// (ADR-0003). APPROVED is everyone with a seat, through a request or added
// without one; CANCELLED the people who gave theirs back.
export const PARTICIPANT_STATUSES = ['APPROVED', 'CANCELLED'] as const;

export type Participant = {
  // The seat.
  id: string;
  status: SeatStatus;
  // APPROVED: the message of the request that led to the seat, if any.
  // CANCELLED: the participant's words when cancelling (ADR-0017).
  message: string | null;
  // When the person got the seat, or gave it back.
  changedAt: Date;
  // CANCELLED only: they have asked to join again since.
  asksAgain: boolean;
  person: ApplicantProfile;
};

export type ParticipantPage = { items: Participant[]; total: number };

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

export type EventStateViolation =
  'EVENT_CANCELLED' | 'EVENT_NOT_HELD' | 'EVENT_FINISHED' | 'EVENT_STARTED';

// Why the organizer cannot decide a request now (F-05.7). APPLICANT_HAS_SEAT
// shows only once the seat is taken, so the repository reports it.
export type DecisionRuleViolation =
  | EventStateViolation
  | 'EVENT_HIDDEN'
  | 'EVENT_FULL'
  | 'NOT_PENDING'
  | 'APPLICANT_HAS_SEAT';

export type Decision = 'APPROVE' | 'REJECT';

// F-06.4: why a participant cannot cancel their seat now.
export type CancelRuleViolation = EventStateViolation | 'NO_SEAT';

// The states the event detail tells apart, decided the same way. Null while
// the event is still ahead.
export const eventStateViolation = (
  event: Pick<EventFacts, 'status' | 'startAt' | 'endAt'>,
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

// The request a person sees on an event: the latest one waiting or decided.
// Withdrawn and closed requests are history and leave the person free to ask
// again. So does a seat they cancelled (F-06.4): the approved request stays,
// and a new one asked after it is the current one (ADR-0017).
const CURRENT_REQUEST_STATUSES: readonly RequestStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

export const currentRequestOf = (
  requests: ParticipationRequest[],
): ParticipationRequest | null =>
  requests
    .filter((request) => CURRENT_REQUEST_STATUSES.includes(request.status))
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())[0] ??
  null;

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
  if (isOrganizerOf(event, applicantId)) {
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
  event: Pick<
    EventFacts,
    'status' | 'startAt' | 'endAt' | 'freeSpots' | 'isHidden'
  >,
  request: Pick<ParticipationRequest, 'status'>,
  decision: Decision,
  now: Date,
): DecisionRuleViolation[] => {
  const violations: DecisionRuleViolation[] = [];
  // #239, ADR-0022: requests to an event an administrator hid wait until it
  // is back.
  if (event.isHidden) {
    violations.push('EVENT_HIDDEN');
  }
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

// F-06.4: a participant may cancel their seat any time before the event
// starts, with no penalty in the MVP (custom deadlines are F-05.14).
export const cancelRuleViolations = (
  event: Pick<EventSeatFacts, 'status' | 'startAt' | 'endAt' | 'hasSeat'>,
  now: Date,
): CancelRuleViolation[] => {
  const violations: CancelRuleViolation[] = [];
  const state = eventStateViolation(event, now);
  if (state) {
    violations.push(state);
  }
  if (!event.hasSeat) {
    violations.push('NO_SEAT');
  }
  return violations;
};

// F-06.3: what the overview of a person's applications reads of one event and
// the person's own rows on it. The seat is null without a roster row; only the
// two seat states that tell a story matter here.
export type ApplicationFacts = {
  eventStatus: 'PUBLISHED' | 'CANCELLED';
  seat: 'APPROVED' | 'CANCELLED' | null;
  requests: RequestStatus[];
};

export type EventApplicationFacts = ApplicationFacts & { eventId: string };

export type ApplicationFactsPage = {
  items: EventApplicationFacts[];
  total: number;
};
