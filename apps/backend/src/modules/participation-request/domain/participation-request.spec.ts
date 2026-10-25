import { EventSeatFacts } from '@/modules/event/domain/event';
import {
  currentRequestOf,
  decisionRuleViolations,
  joinRuleViolations,
  ParticipationRequest,
  RequestStatus,
} from './participation-request';

const now = new Date('2030-01-01T12:00:00Z');

const anEvent = (overrides: Partial<EventSeatFacts> = {}): EventSeatFacts => ({
  id: 'e1',
  status: 'PUBLISHED',
  startAt: new Date('2030-01-01T18:00:00Z'),
  endAt: new Date('2030-01-01T20:00:00Z'),
  approvalMode: 'MANUAL',
  organizerIds: ['organizer', 'co-organizer'],
  freeSpots: 3,
  hasSeat: false,
  ...overrides,
});

const aRequest = (
  status: RequestStatus,
  requestedAt = new Date('2029-12-30T10:00:00Z'),
): ParticipationRequest => ({
  id: `r-${status}-${requestedAt.getTime()}`,
  eventId: 'e1',
  userId: 'u1',
  status,
  message: null,
  requestedAt,
  decidedAt: status === 'PENDING' ? null : requestedAt,
  rejectionReason: null,
});

describe('joinRuleViolations', () => {
  it('lets a stranger ask to join an upcoming event with a free seat', () => {
    expect(joinRuleViolations(anEvent(), 'u1', [], now)).toEqual([]);
  });

  it.each([
    ['a cancelled event', { status: 'CANCELLED' }, 'EVENT_CANCELLED'],
    ['an event that has started', { startAt: now }, 'EVENT_STARTED'],
    ['an event that is over', { status: 'FINISHED' }, 'EVENT_FINISHED'],
    [
      'a published event past its end',
      {
        startAt: new Date('2030-01-01T09:00:00Z'),
        endAt: new Date('2030-01-01T11:00:00Z'),
      },
      'EVENT_FINISHED',
    ],
    ['an event that did not happen', { status: 'NOT_HELD' }, 'EVENT_NOT_HELD'],
    ['a full event', { freeSpots: 0 }, 'EVENT_FULL'],
    ['someone with a seat', { hasSeat: true }, 'HAS_SEAT'],
  ] as const)('refuses %s', (_, override, violation) => {
    expect(joinRuleViolations(anEvent(override), 'u1', [], now)).toEqual([
      violation,
    ]);
  });

  it.each(['organizer', 'co-organizer'])('refuses the %s', (userId) => {
    expect(joinRuleViolations(anEvent(), userId, [], now)).toEqual([
      'IS_ORGANIZER',
    ]);
  });

  it('refuses a second request while one is pending', () => {
    expect(
      joinRuleViolations(anEvent(), 'u1', [aRequest('PENDING')], now),
    ).toEqual(['ALREADY_REQUESTED']);
  });

  // ADR-0013: a rejection is final, so the organizer is not asked again.
  it('refuses someone the organizer has rejected', () => {
    expect(
      joinRuleViolations(anEvent(), 'u1', [aRequest('REJECTED')], now),
    ).toEqual(['REJECTED_BEFORE']);
  });

  it.each(['WITHDRAWN', 'CLOSED'] as const)(
    'lets someone ask again after a %s request',
    (status) => {
      expect(
        joinRuleViolations(anEvent(), 'u1', [aRequest(status)], now),
      ).toEqual([]);
    },
  );
});

describe('currentRequestOf', () => {
  it('is nothing for no requests or only ended ones', () => {
    expect(currentRequestOf([])).toBeNull();
    expect(
      currentRequestOf([aRequest('WITHDRAWN'), aRequest('CLOSED')]),
    ).toBeNull();
  });

  it('prefers the pending request over an older decision', () => {
    const pending = aRequest('PENDING', new Date('2029-12-31T10:00:00Z'));
    expect(currentRequestOf([aRequest('WITHDRAWN'), pending])).toBe(pending);
  });

  it('shows the rejection when nothing is pending', () => {
    const rejected = aRequest('REJECTED');
    expect(currentRequestOf([rejected, aRequest('WITHDRAWN')])).toBe(rejected);
  });
});

describe('decisionRuleViolations', () => {
  it.each(['APPROVE', 'REJECT'] as const)(
    'lets the organizer %s a waiting request before the event starts',
    (decision) => {
      expect(
        decisionRuleViolations(anEvent(), aRequest('PENDING'), decision, now),
      ).toEqual([]);
    },
  );

  it.each([
    ['a cancelled event', { status: 'CANCELLED' }, 'EVENT_CANCELLED'],
    ['an event that has started', { startAt: now }, 'EVENT_STARTED'],
    ['an event that is over', { status: 'FINISHED' }, 'EVENT_FINISHED'],
    ['an event that did not happen', { status: 'NOT_HELD' }, 'EVENT_NOT_HELD'],
  ] as const)('refuses both decisions on %s', (_, override, violation) => {
    for (const decision of ['APPROVE', 'REJECT'] as const) {
      expect(
        decisionRuleViolations(
          anEvent(override),
          aRequest('PENDING'),
          decision,
          now,
        ),
      ).toEqual([violation]);
    }
  });

  // Approval takes a seat, rejection does not.
  it('refuses to approve on a full event, but lets it reject', () => {
    const full = anEvent({ freeSpots: 0 });
    expect(
      decisionRuleViolations(full, aRequest('PENDING'), 'APPROVE', now),
    ).toEqual(['EVENT_FULL']);
    expect(
      decisionRuleViolations(full, aRequest('PENDING'), 'REJECT', now),
    ).toEqual([]);
  });

  it.each(['APPROVED', 'REJECTED', 'WITHDRAWN', 'CLOSED'] as const)(
    'refuses to decide a %s request again',
    (status) => {
      expect(
        decisionRuleViolations(anEvent(), aRequest(status), 'REJECT', now),
      ).toEqual(['NOT_PENDING']);
    },
  );
});
