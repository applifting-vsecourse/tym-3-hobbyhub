import {
  EventChange,
  Notification,
  NotificationType,
} from '@/modules/notification/domain/notification';

// F-09.5, ADR-0016: what the e-mail of a notification says. The bell writes
// the same sentence from the same data in the reader's language (ADR-0015,
// apps/frontend/src/features/notification/lib/notificationText.ts); the
// e-mail is Czech only for now. Keep the headings in step with the `cs`
// texts of `notifications.text` there.

export type NotificationForEmail = Notification & {
  recipient: { email: string; emailVerified: boolean };
};

export type NotificationEmailContent = {
  subject: string;
  heading: string;
  body?: string;
  quote?: { label: string; text: string };
  buttonLabel: string;
  // Where the button leads in the frontend, the same page as the bell's link.
  path: string;
  critical: boolean;
};

// Someone who goes would come for nothing without these, so they go first
// and may use the reserve of the daily budget.
export const CRITICAL_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'EVENT_CHANGED',
  'EVENT_CANCELLED',
];

const SOMEONE = 'Někdo';

const changedHeading = (title: string, changes: EventChange[]): string => {
  const time = changes.includes('TIME');
  const place = changes.includes('PLACE');
  if (time && !place) return `Akce ${title} má nový čas`;
  if (place && !time) return `Akce ${title} má nové místo`;
  return `Akce ${title} má nový čas i místo`;
};

const changedBody = (changes: EventChange[]): string => {
  const time = changes.includes('TIME');
  const place = changes.includes('PLACE');
  if (time && !place) {
    return 'Podívej se na nový termín a zkontroluj, jestli ti vyhovuje.';
  }
  if (place && !time) return 'Podívej se, kde se akce nově koná.';
  return 'Podívej se na nový termín i místo akce.';
};

type Draft = Omit<NotificationEmailContent, 'subject' | 'critical'>;

const eventDraft = (
  notification: Notification,
  event: { id: string; title: string },
): Draft | null => {
  const { type, payload } = notification;
  const title = event.title;
  const eventPath = `/events/${event.id}`;
  switch (type) {
    case 'NEW_REQUESTS':
      return {
        heading: `${notification.actor?.name ?? SOMEONE} žádá o účast na akci ${title}`,
        body: 'Žádost čeká na tvoje rozhodnutí. Schválit nebo zamítnout ji můžeš ve správě účastníků.',
        buttonLabel: 'Zobrazit žádosti',
        path: `${eventPath}/participants?tab=requests`,
      };
    case 'REQUEST_DECIDED':
      return payload.decision === 'REJECTED'
        ? {
            heading: `Tvoje žádost o účast na akci ${title} byla zamítnuta`,
            ...(payload.message
              ? {
                  quote: {
                    label: 'Zpráva od organizátora:',
                    text: payload.message,
                  },
                }
              : {}),
            buttonLabel: 'Zobrazit akci',
            path: eventPath,
          }
        : {
            heading: `Tvoje žádost o účast na akci ${title} byla schválena`,
            body: 'Máš místo. Podrobnosti najdeš v detailu akce.',
            buttonLabel: 'Zobrazit akci',
            path: eventPath,
          };
    case 'EVENT_CHANGED': {
      const changes = payload.changes ?? [];
      return {
        heading: changedHeading(title, changes),
        body: changedBody(changes),
        buttonLabel: 'Zobrazit akci',
        path: eventPath,
      };
    }
    case 'EVENT_CANCELLED':
      return {
        heading: `Akce ${title} byla zrušena`,
        body: 'Organizátor akci zrušil. Podrobnosti najdeš v detailu akce.',
        buttonLabel: 'Zobrazit akci',
        path: eventPath,
      };
    default:
      return null;
  }
};

const groupDraft = (
  notification: Notification,
  group: { id: string; name: string },
): Draft | null => {
  const { type, payload } = notification;
  const name = group.name;
  const groupPath = `/groups/${group.id}`;
  switch (type) {
    case 'NEW_REQUESTS':
      return {
        heading: `${notification.actor?.name ?? SOMEONE} žádá o členství ve skupině ${name}`,
        body: 'Žádost čeká na rozhodnutí zakladatele nebo správce skupiny.',
        buttonLabel: 'Zobrazit žádosti',
        path: `${groupPath}/members?tab=requests`,
      };
    case 'REQUEST_DECIDED':
      return payload.decision === 'REJECTED'
        ? {
            heading: `Tvoje žádost o členství ve skupině ${name} byla zamítnuta`,
            ...(payload.message
              ? {
                  quote: {
                    label: 'Zpráva od správce skupiny:',
                    text: payload.message,
                  },
                }
              : {}),
            buttonLabel: 'Zobrazit skupinu',
            path: groupPath,
          }
        : {
            heading: `Tvoje žádost o členství ve skupině ${name} byla schválena`,
            body: 'Teď jsi členem skupiny.',
            buttonLabel: 'Zobrazit skupinu',
            path: groupPath,
          };
    default:
      return null;
  }
};

/**
 * The e-mail of a notification, or null when it has none: a type nothing
 * creates yet (F-05.8, F-05.9 …), or the event or group is gone.
 */
export const notificationEmailOf = (
  notification: Notification,
): NotificationEmailContent | null => {
  const draft = notification.event
    ? eventDraft(notification, notification.event)
    : notification.group
      ? groupDraft(notification, notification.group)
      : null;
  if (!draft) return null;
  return {
    ...draft,
    subject: draft.heading,
    critical: CRITICAL_NOTIFICATION_TYPES.includes(notification.type),
  };
};
