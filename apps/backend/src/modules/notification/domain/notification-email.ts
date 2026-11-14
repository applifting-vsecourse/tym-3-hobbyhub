import {
  EventChange,
  Notification,
  NotificationType,
} from '@/modules/notification/domain/notification';

// F-09.5, ADR-0018: what the e-mail of a notification says. The visibility
// matrix (docs/visibility-matrix/README.md, "Notifikace a e-mail nesou jen
// důvod a odkaz") keeps it to the reason and a link: an e-mail lives outside
// the login, can be forwarded and nobody can take it back. So it names no
// person and no event or group, not even a public one: the e-mail cannot
// know whether it stays public. The detail is behind the button, where the
// matrix applies. Czech only for now.

export type NotificationForEmail = Notification & {
  recipient: { email: string; emailVerified: boolean };
};

export type NotificationEmailContent = {
  subject: string;
  heading: string;
  body?: string;
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
  'EVENT_HIDDEN',
];

const changedHeading = (changes: EventChange[]): string => {
  const time = changes.includes('TIME');
  const place = changes.includes('PLACE');
  if (time && !place) return 'Akce, na kterou jdeš, má nový čas';
  if (place && !time) return 'Akce, na kterou jdeš, má nové místo';
  return 'Akce, na kterou jdeš, má nový čas i místo';
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
  eventId: string,
): Draft | null => {
  const { type, payload } = notification;
  const eventPath = `/events/${eventId}`;
  switch (type) {
    case 'NEW_REQUESTS':
      return {
        heading: 'Máš novou žádost o účast na své akci',
        body: 'Žádost čeká na tvoje rozhodnutí. Schválit nebo zamítnout ji můžeš ve správě účastníků.',
        buttonLabel: 'Zobrazit žádosti',
        path: `${eventPath}/participants?tab=requests`,
      };
    case 'REQUEST_DECIDED':
      return payload.decision === 'REJECTED'
        ? {
            heading: 'Tvoje žádost o účast na akci byla zamítnuta',
            body: 'Podrobnosti najdeš v detailu akce.',
            buttonLabel: 'Zobrazit akci',
            path: eventPath,
          }
        : {
            heading: 'Tvoje žádost o účast na akci byla schválena',
            body: 'Máš místo. Podrobnosti najdeš v detailu akce.',
            buttonLabel: 'Zobrazit akci',
            path: eventPath,
          };
    case 'EVENT_CHANGED': {
      const changes = payload.changes ?? [];
      return {
        heading: changedHeading(changes),
        body: changedBody(changes),
        buttonLabel: 'Zobrazit akci',
        path: eventPath,
      };
    }
    case 'EVENT_CANCELLED':
      return {
        heading: 'Akce, na kterou jdeš, byla zrušena',
        body: 'Organizátor akci zrušil. Podrobnosti najdeš v detailu akce.',
        buttonLabel: 'Zobrazit akci',
        path: eventPath,
      };
    // #239, ADR-0022: the organizers' copy carries the reason (not in the
    // e-mail, only behind the button); the others' copy does not, and their
    // button leads to their own events, since the event does not exist for
    // them any more.
    case 'EVENT_HIDDEN':
      return payload.reason !== undefined
        ? {
            heading: 'Tvoji akci skryl správce',
            body: 'Akci teď nikdo jiný nevidí. Důvod najdeš v detailu akce.',
            buttonLabel: 'Zobrazit akci',
            path: eventPath,
          }
        : {
            heading: 'Akce, kterou máš v přehledu, byla odstraněna',
            body: 'Akci odstranil správce HobbyHubu. Přehled svých akcí najdeš v aplikaci.',
            buttonLabel: 'Moje akce',
            path: '/my-events',
          };
    case 'EVENT_RESTORED':
      return {
        heading: 'Akce, kterou máš v přehledu, je zpět',
        body: 'Správce akci znovu zveřejnil. Podrobnosti najdeš v detailu akce.',
        buttonLabel: 'Zobrazit akci',
        path: eventPath,
      };
    // F-09.2 (#58): to every organizer. The participant's words stay out like
    // their name: the organizers read both on the participants page, under
    // "Odhlášení", which the event detail links to.
    case 'PARTICIPANT_CANCELLED':
      return {
        heading: 'Účastník se odhlásil z tvé akce',
        body: 'Uvolnilo se místo. Kdo to byl a proč, najdeš v přehledu účastníků akce.',
        buttonLabel: 'Zobrazit akci',
        path: eventPath,
      };
    default:
      return null;
  }
};

const groupDraft = (
  notification: Notification,
  groupId: string,
): Draft | null => {
  const { type, payload } = notification;
  const groupPath = `/groups/${groupId}`;
  switch (type) {
    case 'NEW_REQUESTS':
      return {
        heading: 'Máš novou žádost o členství ve své skupině',
        body: 'Žádost čeká na rozhodnutí zakladatele nebo správce skupiny.',
        buttonLabel: 'Zobrazit žádosti',
        path: `${groupPath}/members?tab=requests`,
      };
    case 'REQUEST_DECIDED':
      return payload.decision === 'REJECTED'
        ? {
            heading: 'Tvoje žádost o členství ve skupině byla zamítnuta',
            body: 'Podrobnosti najdeš v detailu skupiny.',
            buttonLabel: 'Zobrazit skupinu',
            path: groupPath,
          }
        : {
            heading: 'Tvoje žádost o členství ve skupině byla schválena',
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
    ? eventDraft(notification, notification.event.id)
    : notification.group
      ? groupDraft(notification, notification.group.id)
      : null;
  if (!draft) return null;
  return {
    ...draft,
    subject: draft.heading,
    critical: CRITICAL_NOTIFICATION_TYPES.includes(notification.type),
  };
};
