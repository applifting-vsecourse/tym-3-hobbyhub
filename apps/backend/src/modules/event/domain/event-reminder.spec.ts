import {
  dueEventReminders,
  EventReminderFacts,
  reminderMomentOf,
} from '@/modules/event/domain/event-reminder';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const startAt = new Date('2030-01-10T18:00:00Z');
const beforeStart = (ms: number): Date => new Date(startAt.getTime() - ms);

const anEvent = (
  overrides: Partial<EventReminderFacts> = {},
): EventReminderFacts => ({
  startAt,
  publishedAt: new Date('2030-01-01T10:00:00Z'),
  sent: [],
  ...overrides,
});

describe('reminderMomentOf', () => {
  it('is 24 hours and 2 hours before the start', () => {
    expect(reminderMomentOf(startAt, 'DAY')).toEqual(beforeStart(24 * HOUR));
    expect(reminderMomentOf(startAt, 'TWO_HOURS')).toEqual(
      beforeStart(2 * HOUR),
    );
  });
});

describe('dueEventReminders', () => {
  it.each<[string, number, string[]]>([
    ['two days before', 48 * HOUR, []],
    ['a minute before the day reminder', 24 * HOUR + MINUTE, []],
    ['at the day reminder', 24 * HOUR, ['DAY']],
    ['13 hours before, late after an outage', 13 * HOUR, ['DAY']],
    ['3 hours before, still late for the day', 3 * HOUR, ['DAY']],
    ['a minute before the 2-hour one takes over', 2 * HOUR + MINUTE, ['DAY']],
    ['at the 2-hour reminder', 2 * HOUR, ['TWO_HOURS']],
    ['an hour before, late after an outage', HOUR, ['TWO_HOURS']],
    ['a minute before the start', MINUTE, ['TWO_HOURS']],
    ['once it started', 0, []],
  ])('%s: %j', (_when, msBefore, due) => {
    expect(dueEventReminders(anEvent(), beforeStart(msBefore))).toEqual(due);
  });

  it('does not send a reminder twice for the same start', () => {
    const event = anEvent({ sent: [{ kind: 'DAY', eventStartAt: startAt }] });

    expect(dueEventReminders(event, beforeStart(20 * HOUR))).toEqual([]);
  });

  it('sends it again when the start moved after it went out', () => {
    const event = anEvent({
      sent: [{ kind: 'DAY', eventStartAt: beforeStart(48 * HOUR) }],
    });

    expect(dueEventReminders(event, beforeStart(23 * HOUR))).toEqual(['DAY']);
  });

  it('does not count a reminder of the other kind', () => {
    const event = anEvent({ sent: [{ kind: 'DAY', eventStartAt: startAt }] });

    expect(dueEventReminders(event, beforeStart(2 * HOUR))).toEqual([
      'TWO_HOURS',
    ]);
  });

  it('skips a reminder whose moment passed before the event was published', () => {
    const event = anEvent({ publishedAt: beforeStart(20 * HOUR) });

    expect(dueEventReminders(event, beforeStart(19 * HOUR))).toEqual([]);
    expect(dueEventReminders(event, beforeStart(2 * HOUR))).toEqual([
      'TWO_HOURS',
    ]);
  });

  it('has nothing for an event never published', () => {
    expect(
      dueEventReminders(anEvent({ publishedAt: null }), beforeStart(2 * HOUR)),
    ).toEqual([]);
  });
});
