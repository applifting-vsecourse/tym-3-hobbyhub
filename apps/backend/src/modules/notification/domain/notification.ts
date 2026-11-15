// #152, ADR-0015: a notification is one record of "something happened that
// concerns you". It stores the type and the data, never the text: the client
// puts the sentence together in the reader's language from the type, the
// linked rows (who did it, which event or group) and the small payload.

export const NOTIFICATION_LIST_DEFAULT_LIMIT = 20;
export const NOTIFICATION_LIST_MAX_LIMIT = 50;

// The same values as the `notification_type` enum. They double as the
// categories a user can switch off for e-mail (F-04.3); the bell ignores that.
export const NOTIFICATION_TYPES = [
  'NEW_REQUESTS',
  'PARTICIPANT_CANCELLED',
  'REQUEST_DECIDED',
  'CONFIRMATION_PROMPT',
  'SPOT_AVAILABLE',
  'GROUP_INVITATION',
  'EVENT_BOARD',
  'ONBOARDING_SERIES',
  'MONTHLY_RECOMMENDATION',
  'EVENT_CHANGED',
  'EVENT_CANCELLED',
  'EVENT_REMINDER',
  'HOSTED_EVENT_REMINDER',
  'FRIEND_REQUEST',
  'FRIEND_REQUEST_ACCEPTED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// #175: what the notification page filters by. Every type belongs to exactly
// one kind; only the server knows which, the client sends the kind.
export const NOTIFICATION_KINDS = [
  'requests',
  'events',
  'groups',
  'other',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_TYPES_BY_KIND = {
  requests: [
    'NEW_REQUESTS',
    'REQUEST_DECIDED',
    'PARTICIPANT_CANCELLED',
    'CONFIRMATION_PROMPT',
    'SPOT_AVAILABLE',
    // #228: a friend request and its acceptance are requests too.
    'FRIEND_REQUEST',
    'FRIEND_REQUEST_ACCEPTED',
  ],
  events: [
    'EVENT_CHANGED',
    'EVENT_CANCELLED',
    'EVENT_BOARD',
    'EVENT_REMINDER',
    'HOSTED_EVENT_REMINDER',
  ],
  groups: ['GROUP_INVITATION'],
  other: ['ONBOARDING_SERIES', 'MONTHLY_RECOMMENDATION'],
} as const satisfies Record<NotificationKind, readonly NotificationType[]>;

export const notificationTypesOf = (
  kind: NotificationKind,
): readonly NotificationType[] => NOTIFICATION_TYPES_BY_KIND[kind];

// Which of the recipient's notifications a page of the list holds. Without
// `read` both the read and the unread ones, without `kind` every type.
export type NotificationFilter = {
  read?: boolean;
  kind?: NotificationKind;
};

export const DECISIONS = ['APPROVED', 'REJECTED'] as const;
export type Decision = (typeof DECISIONS)[number];

// What an edit of an event changed that its participants care about (F-09.3).
export const EVENT_CHANGES = ['TIME', 'PLACE'] as const;
export type EventChange = (typeof EVENT_CHANGES)[number];

// #233, ADR-0021: which reminder before the start: 24 hours, or 2 hours. The
// same values as the `event_reminder_kind` enum.
export const EVENT_REMINDERS = ['DAY', 'TWO_HOURS'] as const;
export type EventReminderKind = (typeof EVENT_REMINDERS)[number];

// HOSTED_EVENT_REMINDER: how full the event was when the reminder went out.
export type ReminderOccupancy = {
  occupiedSpots: number;
  maxParticipants: number;
  missingToMinimum: number;
};

// What the text needs besides the linked rows. Every field is optional; which
// ones a type carries is written next to each `notify…` method of the service.
export type NotificationPayload = {
  // REQUEST_DECIDED
  decision?: Decision;
  // REQUEST_DECIDED: the organizer's or the admins' words, if any (#153).
  // PARTICIPANT_CANCELLED: the participant's words, always there.
  message?: string;
  // EVENT_CHANGED
  changes?: EventChange[];
  // EVENT_REMINDER, HOSTED_EVENT_REMINDER
  reminder?: EventReminderKind;
  // EVENT_REMINDER, HOSTED_EVENT_REMINDER: the start the reminder was for, an
  // ISO date (JSON has no dates).
  startsAt?: string;
  // HOSTED_EVENT_REMINDER
  occupancy?: ReminderOccupancy;
};

export type NotificationPerson = { id: string; name: string };
export type NotificationEvent = { id: string; title: string };
export type NotificationGroup = { id: string; name: string };

// #228: the states of a friend request, as the friendship module has them
// (ADR-0023). This module imports no other one, so it keeps its own copy.
export const FRIEND_REQUEST_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type FriendRequestStatus = (typeof FRIEND_REQUEST_STATUSES)[number];
// FRIEND_REQUEST: the request it is about and where it stands now, so the
// bell shows the buttons only while it waits.
export type NotificationFriendRequest = {
  id: string;
  status: FriendRequestStatus;
};

export type Notification = {
  id: string;
  type: NotificationType;
  payload: NotificationPayload;
  createdAt: Date;
  readAt: Date | null;
  recipientId: string;
  // Who caused it; null for a notification the system sends on its own, or
  // whose author has since been deleted.
  actor: NotificationPerson | null;
  event: NotificationEvent | null;
  group: NotificationGroup | null;
  friendRequest: NotificationFriendRequest | null;
};

export type NotificationPage = { items: Notification[]; total: number };

export type Page = { limit: number; offset: number };

// What a new notification is made of; one is written per recipient.
export type NewNotification = {
  type: NotificationType;
  recipientIds: string[];
  actorId: string | null;
  eventId?: string;
  groupId?: string;
  friendRequestId?: string;
  payload?: NotificationPayload;
};

// The people to tell, each once, and never the one who caused the event: an
// organizer who approves a request knows about it already.
export const recipientsExcept = (
  candidateIds: readonly string[],
  actorId: string | null,
): string[] => [...new Set(candidateIds)].filter((id) => id !== actorId);

// What an edit of an event looks like to the people who go: the moment, and
// the place. Only the address and the kind of venue count as the place; a
// renamed venue ("tělocvična" → "velká tělocvična") is the same place.
export type EventWhenAndWhere = {
  startAt: Date;
  endAt: Date;
  venueType: string;
  location: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  } | null;
};

const sameMoment = (a: Date, b: Date): boolean => a.getTime() === b.getTime();

const samePlace = (
  a: EventWhenAndWhere['location'],
  b: EventWhenAndWhere['location'],
): boolean =>
  a === null || b === null
    ? a === b
    : a.street === b.street &&
      a.city === b.city &&
      a.postalCode === b.postalCode &&
      a.country === b.country;

// F-09.3: which of the changes an edit made are worth telling the approved
// participants about. Empty when nothing they care about changed.
export const eventChangesOf = (
  before: EventWhenAndWhere,
  after: EventWhenAndWhere,
): EventChange[] => {
  const changes: EventChange[] = [];
  if (
    !sameMoment(before.startAt, after.startAt) ||
    !sameMoment(before.endAt, after.endAt)
  ) {
    changes.push('TIME');
  }
  if (
    before.venueType !== after.venueType ||
    !samePlace(before.location, after.location)
  ) {
    changes.push('PLACE');
  }
  return changes;
};
