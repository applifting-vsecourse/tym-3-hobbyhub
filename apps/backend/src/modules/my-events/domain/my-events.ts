import { EventListItem } from '@/modules/event/domain/event';
import { ApplicationFacts } from '@/modules/participation-request/domain/participation-request';

// F-06.3: the state a person's application to an event is in, as the overview
// tells it. WITHDRAWN covers both a request cancelled while waiting and a seat
// given up later; the person sees both as "signed off". ADR-0003: PENDING and
// REJECTED come from the request, APPROVED and WITHDRAWN from the seat.
export type ApplicationStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'EVENT_CANCELLED';

// One status per event. A cancelled event outranks anything still alive (a
// seat, a waiting request, a request closed by the cancellation); a person who
// had already left or been turned down keeps their own outcome. Null when the
// person has no application worth showing (e.g. only a waitlist row).
export const applicationStatusOf = (
  facts: ApplicationFacts,
): ApplicationStatus | null => {
  const hasPending = facts.requests.includes('PENDING');
  const hasClosed = facts.requests.includes('CLOSED');
  if (
    facts.eventStatus === 'CANCELLED' &&
    (facts.seat === 'APPROVED' || hasPending || hasClosed)
  ) {
    return 'EVENT_CANCELLED';
  }
  if (facts.seat === 'APPROVED') return 'APPROVED';
  if (hasPending) return 'PENDING';
  if (facts.seat === 'CANCELLED') return 'WITHDRAWN';
  if (facts.requests.includes('REJECTED')) return 'REJECTED';
  if (facts.requests.includes('WITHDRAWN')) return 'WITHDRAWN';
  if (hasClosed) return 'EVENT_CANCELLED';
  return null;
};

export type MyApplication = {
  status: ApplicationStatus;
  event: EventListItem;
};

export type MyEventsOverview = {
  applications: MyApplication[];
  hosted: EventListItem[];
};
