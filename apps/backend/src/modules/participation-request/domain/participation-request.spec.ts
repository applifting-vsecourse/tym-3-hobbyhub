import { EventSeatFacts } from '@/modules/event/domain/event';
import {
  currentRequestOf,
  eventClosedViolation,
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

describe('eventClosedViolation', () => {
  it('lets an open event through', () => {
    expect(eventClosedViolation(anEvent(), now)).toBeNull();
  });

  it.each([
    ['EVENT_CANCELLED', { status: 'CANCELLED' as const }],
    ['EVENT_NOT_HELD', { status: 'NOT_HELD' as const }],
    ['EVENT_FINISHED', { status: 'FINISHED' as const }],
    ['EVENT_FINISHED', { endAt: new Date('2030-01-01T11:00:00Z') }],
    ['EVENT_STARTED', { startAt: new Date('2030-01-01T12:00:00Z') }],
  ])('reports %s', (violation, override) => {
    expect(eventClosedViolation(anEvent(override), now)).toBe(violation);
  });
});
