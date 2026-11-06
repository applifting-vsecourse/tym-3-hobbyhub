import { EventListItem } from '@/modules/event/domain/event';
import { ApplicationFacts } from '@/modules/participation-request/domain/participation-request';

// The overview pages like the event list: a page of each of its two lists.
export const MY_EVENTS_DEFAULT_LIMIT = 20;
export const MY_EVENTS_MAX_LIMIT = 50;

// F-06.3: the state a person's application to an event is in, as the overview
// tells it. WITHDRAWN covers both a request cancelled while waiting and a seat
// given up later; the person sees both as "signed off". ADR-0003: PENDING and
// REJECTED come from the request, APPROVED and WITHDRAWN from the seat.
export const APPLICATION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'EVENT_CANCELLED',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// One status per event. A cancelled event outranks anything still alive (a
// seat, a waiting request, a request closed by the cancellation); a person who
// had already left or been turned down keeps their own outcome. Null only for a
// person with nothing to show (e.g. a waitlist row alone). An approved request
// without a seat row counts as the seat it created (ADR-0003).
export const applicationStatusOf = (
  facts: ApplicationFacts,
): ApplicationStatus | null => {
  const hasPending = facts.requests.includes('PENDING');
  const hasClosed = facts.requests.includes('CLOSED');
  const hasSeat =
    facts.seat === 'APPROVED' ||
    (facts.seat === null && facts.requests.includes('APPROVED'));
  if (
    facts.eventStatus === 'CANCELLED' &&
    (hasSeat || hasPending || hasClosed)
  ) {
    return 'EVENT_CANCELLED';
  }
  if (hasSeat) return 'APPROVED';
  if (hasPending) return 'PENDING';
  // A rejection is final for the event (ADR-0013), so it outranks an earlier
  // seat the person gave up: leave, ask again, be turned down.
  if (facts.requests.includes('REJECTED')) return 'REJECTED';
  if (facts.seat === 'CANCELLED') return 'WITHDRAWN';
  if (facts.requests.includes('WITHDRAWN')) return 'WITHDRAWN';
  if (hasClosed) return 'EVENT_CANCELLED';
  return null;
};

export type MyApplication = {
  status: ApplicationStatus;
  event: EventListItem;
};

export type MyApplicationPage = {
  items: MyApplication[];
  total: number;
  // Where the next page starts, or null on the last one. A row the overview
  // cannot show is left out of `items` but still passed, so the client cannot
  // count the offset itself.
  nextOffset: number | null;
};
