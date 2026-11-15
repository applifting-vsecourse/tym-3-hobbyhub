import {
  EVENT_REMINDERS,
  EventReminderKind,
  ReminderOccupancy,
} from '@/modules/notification/domain/notification';

// #233, ADR-0021: reminders before an event starts. Each one is due from its
// moment (24 h, or 2 h before the start) until the next one takes over: the
// day reminder until the 2-hour one is due, the 2-hour one until the start. A
// backend that was down at the moment still sends it late.

const HOUR_MS = 60 * 60 * 1000;

export const EVENT_REMINDER_LEAD_MS: Record<EventReminderKind, number> = {
  DAY: 24 * HOUR_MS,
  TWO_HOURS: 2 * HOUR_MS,
};

// How long before the start a late reminder may still go: the day reminder
// until the 2-hour one takes over, the 2-hour one until the start.
const EVENT_REMINDER_DEADLINE_MS: Record<EventReminderKind, number> = {
  DAY: EVENT_REMINDER_LEAD_MS.TWO_HOURS,
  TWO_HOURS: 0,
};

// The events the poller has to look at: those starting within this window
// from now. Nothing outside it can have a reminder due.
export const EVENT_REMINDER_HORIZON = {
  // The 2-hour reminder is due until the start.
  minStartInMs: EVENT_REMINDER_DEADLINE_MS.TWO_HOURS,
  maxStartInMs: EVENT_REMINDER_LEAD_MS.DAY,
} as const;

// What the rules read of an event: its current start, when it was published,
// and which reminders went out already, each for the start it was for.
export type EventReminderFacts = {
  startAt: Date;
  publishedAt: Date | null;
  sent: readonly { kind: EventReminderKind; eventStartAt: Date }[];
};

// An event the poller looks at, with whom a reminder would go to.
export type EventReminderCandidate = EventReminderFacts & {
  id: string;
  // The organizer and the co-organizers.
  organizerIds: string[];
  // Everyone with an approved seat, organizers among them if they took one.
  participantIds: string[];
  occupancy: ReminderOccupancy;
};

export const reminderMomentOf = (
  startAt: Date,
  kind: EventReminderKind,
): Date => new Date(startAt.getTime() - EVENT_REMINDER_LEAD_MS[kind]);

/**
 * The reminders due now. One is due from its moment until the next one takes
 * over, unless it went out for this start already, or the event was
 * published only after its moment: whoever has a seat by then took it after
 * the reminder's time, and the organizer has just created the event.
 */
export const dueEventReminders = (
  event: EventReminderFacts,
  now: Date,
): EventReminderKind[] =>
  EVENT_REMINDERS.filter((kind) => {
    const moment = reminderMomentOf(event.startAt, kind).getTime();
    const lastChance =
      event.startAt.getTime() - EVENT_REMINDER_DEADLINE_MS[kind];
    if (now.getTime() < moment || now.getTime() >= lastChance) return false;
    if (event.publishedAt === null || event.publishedAt.getTime() > moment) {
      return false;
    }
    return !event.sent.some(
      (sent) =>
        sent.kind === kind &&
        sent.eventStartAt.getTime() === event.startAt.getTime(),
    );
  });
