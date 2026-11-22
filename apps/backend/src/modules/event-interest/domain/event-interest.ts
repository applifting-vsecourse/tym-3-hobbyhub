import {
  EventFacts,
  EventStatus,
  isOrganizerOf,
} from '@/modules/event/domain/event';

// #231, ADR-0030: the "Zajímá mě" list. A person saves an event to come back
// to it later; the row is theirs alone. Saving reserves nothing and is not a
// request to join.

// Why an event cannot be saved now. Removing is never refused.
export const INTEREST_RULE_VIOLATIONS = [
  'EVENT_CANCELLED',
  'EVENT_NOT_HELD',
  'EVENT_FINISHED',
  'EVENT_STARTED',
  'IS_ORGANIZER',
] as const;
export type InterestRuleViolation = (typeof INTEREST_RULE_VIOLATIONS)[number];

// Only a published event that has not started, and never one's own: the
// organizers have it under "Pořádám", and an event that started or is over is
// no longer worth coming back to. Whether the person may see the event at all
// is the service's to decide (the same 404 as the detail).
export const interestRuleViolations = (
  event: Pick<EventFacts, 'status' | 'startAt' | 'endAt' | 'organizerIds'>,
  userId: string,
  now: Date,
): InterestRuleViolation[] => {
  const violations: InterestRuleViolation[] = [];
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
  if (isOrganizerOf(event, userId)) {
    violations.push('IS_ORGANIZER');
  }
  return violations;
};

// What the detail asks about the signed-in person: whether the event is on
// their list, and why saving it is refused now (empty when it is allowed).
export type EventInterestState = {
  isSaved: boolean;
  violations: InterestRuleViolation[];
};

// Where an event on the list stands. UPCOMING: still on (it may have started
// but not ended), so it may still be joined or at least attended. Everything
// else goes below, in "Proběhlé a zrušené": CANCELLED when called off, PAST
// when over (an event that was not held counts as over: it is gone either way).
export const INTERESTED_EVENT_STATES = [
  'UPCOMING',
  'PAST',
  'CANCELLED',
] as const;
export type InterestedEventState = (typeof INTERESTED_EVENT_STATES)[number];

export const interestedEventStateOf = (
  event: { status: EventStatus; endAt: Date },
  now: Date,
): InterestedEventState => {
  if (event.status === 'CANCELLED') return 'CANCELLED';
  if (event.status === 'PUBLISHED' && event.endAt.getTime() >= now.getTime()) {
    return 'UPCOMING';
  }
  return 'PAST';
};

// One page of the list as the repository finds it: which events, in order,
// with the status the state above needs. Only events the person may still
// see are on it, and `total` counts only those.
export type EventInterestPage = {
  items: { eventId: string; status: EventStatus }[];
  total: number;
};
