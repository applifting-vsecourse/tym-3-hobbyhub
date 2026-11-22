import { EventFacts } from '@/modules/event/domain/event';
import {
  interestedEventStateOf,
  interestRuleViolations,
  watchRuleViolations,
} from './event-interest';

const now = new Date('2030-01-01T12:00:00Z');
const hour = 60 * 60 * 1000;

const event = (
  override: Partial<
    Pick<EventFacts, 'status' | 'startAt' | 'endAt' | 'organizerIds'>
  > = {},
): Pick<EventFacts, 'status' | 'startAt' | 'endAt' | 'organizerIds'> => ({
  status: 'PUBLISHED',
  startAt: new Date(now.getTime() + 24 * hour),
  endAt: new Date(now.getTime() + 26 * hour),
  organizerIds: ['organizer', 'co-organizer'],
  ...override,
});

describe('interestRuleViolations', () => {
  // Free seats are not a rule: a full event is one reason to save it.
  it('lets anyone save a published event that has not started', () => {
    expect(interestRuleViolations(event(), 'u1', now)).toEqual([]);
  });

  it.each(['organizer', 'co-organizer'])(
    'refuses the %s: they have the event under "Pořádám"',
    (userId) => {
      expect(interestRuleViolations(event(), userId, now)).toEqual([
        'IS_ORGANIZER',
      ]);
    },
  );

  it('refuses an event that has started', () => {
    expect(
      interestRuleViolations(
        event({
          startAt: new Date(now.getTime() - hour),
          endAt: new Date(now.getTime() + hour),
        }),
        'u1',
        now,
      ),
    ).toEqual(['EVENT_STARTED']);
  });

  it('refuses at the very start', () => {
    expect(interestRuleViolations(event({ startAt: now }), 'u1', now)).toEqual([
      'EVENT_STARTED',
    ]);
  });

  it.each<[Partial<EventFacts>, string]>([
    [{ status: 'CANCELLED' }, 'EVENT_CANCELLED'],
    [{ status: 'NOT_HELD' }, 'EVENT_NOT_HELD'],
    [{ status: 'FINISHED' }, 'EVENT_FINISHED'],
    [{ status: 'DRAFT' }, 'EVENT_FINISHED'],
    [
      {
        startAt: new Date(now.getTime() - 3 * hour),
        endAt: new Date(now.getTime() - hour),
      },
      'EVENT_FINISHED',
    ],
  ])('refuses %j with %s', (override, violation) => {
    expect(interestRuleViolations(event(override), 'u1', now)).toEqual([
      violation,
    ]);
  });

  it('gives every reason at once', () => {
    expect(
      interestRuleViolations(event({ status: 'CANCELLED' }), 'organizer', now),
    ).toEqual(['EVENT_CANCELLED', 'IS_ORGANIZER']);
  });
});

describe('interestedEventStateOf', () => {
  it('keeps an event that has started but not ended among the upcoming', () => {
    expect(
      interestedEventStateOf(
        { status: 'PUBLISHED', endAt: new Date(now.getTime() + hour) },
        now,
      ),
    ).toBe('UPCOMING');
  });

  it('moves an event that ended to the past, even before it is closed', () => {
    expect(
      interestedEventStateOf(
        { status: 'PUBLISHED', endAt: new Date(now.getTime() - hour) },
        now,
      ),
    ).toBe('PAST');
  });

  it.each<[string, string]>([
    ['FINISHED', 'PAST'],
    ['NOT_HELD', 'PAST'],
    ['CANCELLED', 'CANCELLED'],
  ])('maps %s to %s', (status, state) => {
    expect(
      interestedEventStateOf(
        {
          status: status as 'FINISHED',
          endAt: new Date(now.getTime() + hour),
        },
        now,
      ),
    ).toBe(state);
  });
});

// #232: watching is for an event one would join now if it were not full.
describe('watchRuleViolations', () => {
  it('allows watching when being full is the one reason joining is refused', () => {
    expect(watchRuleViolations(['EVENT_FULL'])).toEqual([]);
  });

  it('refuses an event with a free seat: there is nothing to watch for', () => {
    expect(watchRuleViolations([])).toEqual(['EVENT_NOT_FULL']);
  });

  it.each([
    ['HAS_SEAT'],
    ['ALREADY_REQUESTED'],
    ['REJECTED_BEFORE'],
    ['IS_ORGANIZER'],
    ['EVENT_STARTED'],
    ['EVENT_CANCELLED'],
    ['EVENT_NOT_HELD'],
    ['EVENT_FINISHED'],
  ] as const)(
    'refuses a full event the person could not join anyway: %s',
    (violation) => {
      expect(watchRuleViolations([violation, 'EVENT_FULL'])).toEqual([
        violation,
      ]);
      expect(watchRuleViolations([violation])).toEqual([violation]);
    },
  );
});
