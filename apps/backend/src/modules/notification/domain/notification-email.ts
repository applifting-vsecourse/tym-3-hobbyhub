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
  recipient: {
    email: string;
    emailVerified: boolean;
    // F-04.3: the types the recipient switched off for e-mail. The bell
    // shows them all the same (ADR-0015).
    disabledNotifications: readonly NotificationType[];
  };
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
// and may use the reserve of the daily budget. A reminder (#233) is worth
// nothing once it is late, so it goes first too (ADR-0021). So does a free
// seat (#232): it goes to whoever signs up first, so a late e-mail is a seat
// already taken (ADR-0030, dodatek).
export const CRITICAL_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'EVENT_CHANGED',
  'EVENT_CANCELLED',
  'EVENT_HIDDEN',
  'EVENT_REMINDER',
  'HOSTED_EVENT_REMINDER',
  'SPOT_AVAILABLE',
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
    // #233: no title, time or place; they are behind the button. Nor "zítra"
    // or "za 2 hodiny": a late reminder may go after an outage, and the
    // e-mail may be read later still (ADR-0021).
    case 'EVENT_REMINDER':
      return {
        heading: 'Akce, na kterou jdeš, se blíží',
        body: 'Kdy a kde se akce koná, najdeš v jejím detailu.',
        buttonLabel: 'Zobrazit akci',
        path: eventPath,
      };
    // #233: the organizers; how full it is stays in the app, like the names.
    case 'HOSTED_EVENT_REMINDER':
      return {
        heading: 'Tvoje akce se blíží',
        body: 'Kolik lidí přijde, najdeš v přehledu účastníků akce.',
        buttonLabel: 'Zobrazit účastníky',
        path: `${eventPath}/participants?tab=participants`,
      };
    // #236, ADR-0027: no title and no date; the deadline is behind the
    // button, and the e-mail may be read later than it went out.
    case 'RATING_PROMPT':
      return payload.prompt === 'LAST_CALL'
        ? {
            heading: 'Poslední den na ohodnocení organizátora',
            body: 'Zítra už hodnotit nepůjde. Organizátor tvoje hodnocení uvidí, až lhůta skončí.',
            buttonLabel: 'Ohodnotit',
            path: `${eventPath}/ratings`,
          }
        : {
            heading: 'Jak se ti akce líbila? Ohodnoť organizátora',
            body: 'Hodnotit můžeš týden od konce akce. Organizátor tvoje hodnocení uvidí, až lhůta skončí.',
            buttonLabel: 'Ohodnotit',
            path: `${eventPath}/ratings`,
          };
    case 'HOSTED_RATING_PROMPT':
      return payload.prompt === 'LAST_CALL'
        ? {
            heading: 'Poslední den na ohodnocení účastníků tvé akce',
            body: 'Zítra už hodnotit nepůjde. Účastníci tvoje hodnocení uvidí, až lhůta skončí.',
            buttonLabel: 'Ohodnotit účastníky',
            path: `${eventPath}/ratings`,
          }
        : {
            heading: 'Jací byli spoluhráči? Ohodnoť účastníky své akce',
            body: 'Hodnotit můžeš týden od konce akce, i ty, kdo nepřišli. Účastníci tvoje hodnocení uvidí, až lhůta skončí.',
            buttonLabel: 'Ohodnotit účastníky',
            path: `${eventPath}/ratings`,
          };
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
    // #232: to the people watching the full event. No title and no count of
    // seats; whether one is still free is behind the button.
    case 'SPOT_AVAILABLE':
      return {
        heading: 'Na akci, kterou hlídáš, se uvolnilo místo',
        body: 'Místo ti nedržíme: dostane ho, kdo se přihlásí první. Přihlásit se můžeš v detailu akce.',
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
// #240, ADR-0023: about neither an event nor a group. Only that the report was
// dealt with: not what it was about, nor how.
const standaloneDraft = (notification: Notification): Draft | null => {
  switch (notification.type) {
    case 'REPORT_RESOLVED':
      return {
        heading: 'Tvoje nahlášení jsme vyřídili',
        body: 'Děkujeme, že pomáháš udržet HobbyHub bezpečný. Správce tvoje nahlášení prošel a vyřídil.',
        buttonLabel: 'Zobrazit upozornění',
        path: '/notifications',
      };
    default:
      return null;
  }
};

export const notificationEmailOf = (
  notification: Notification,
): NotificationEmailContent | null => {
  const draft = notification.event
    ? eventDraft(notification, notification.event.id)
    : notification.group
      ? groupDraft(notification, notification.group.id)
      : standaloneDraft(notification);
  if (!draft) return null;
  return {
    ...draft,
    subject: draft.heading,
    critical: CRITICAL_NOTIFICATION_TYPES.includes(notification.type),
  };
};
