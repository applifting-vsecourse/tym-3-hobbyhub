import { Notification } from './notification';
import { notificationEmailOf } from './notification-email';

const aNotification = (
  overrides: Partial<Notification> = {},
): Notification => ({
  id: 'n1',
  type: 'NEW_REQUESTS',
  payload: {},
  createdAt: new Date('2030-01-01T12:00:00Z'),
  readAt: null,
  recipientId: 'u1',
  actor: { id: 'u2', name: 'Honza' },
  event: { id: 'e1', title: 'Čtvrteční florbal' },
  group: null,
  ...overrides,
});

const aboutGroup = {
  event: null,
  group: { id: 'g1', name: 'Běžci z Letné' },
};

describe('notificationEmailOf', () => {
  it('tells an organizer who asks to join and leads to the requests', () => {
    expect(notificationEmailOf(aNotification())).toEqual(
      expect.objectContaining({
        subject: 'Honza žádá o účast na akci Čtvrteční florbal',
        buttonLabel: 'Zobrazit žádosti',
        path: '/events/e1/participants?tab=requests',
        critical: false,
      }),
    );
  });

  it('says "someone" when the applicant is gone', () => {
    expect(notificationEmailOf(aNotification({ actor: null }))?.subject).toBe(
      'Někdo žádá o účast na akci Čtvrteční florbal',
    );
  });

  it('gives a rejected applicant the organizer’s words', () => {
    const email = notificationEmailOf(
      aNotification({
        type: 'REQUEST_DECIDED',
        payload: { decision: 'REJECTED', message: 'Je plno.' },
      }),
    );

    expect(email).toEqual(
      expect.objectContaining({
        subject:
          'Tvoje žádost o účast na akci Čtvrteční florbal byla zamítnuta',
        quote: { label: 'Zpráva od organizátora:', text: 'Je plno.' },
        path: '/events/e1',
      }),
    );
  });

  it('tells an approved applicant', () => {
    const email = notificationEmailOf(
      aNotification({
        type: 'REQUEST_DECIDED',
        payload: { decision: 'APPROVED' },
      }),
    );

    expect(email?.subject).toBe(
      'Tvoje žádost o účast na akci Čtvrteční florbal byla schválena',
    );
    expect(email?.quote).toBeUndefined();
    expect(email?.critical).toBe(false);
  });

  it.each([
    [['TIME'], 'Akce Čtvrteční florbal má nový čas'],
    [['PLACE'], 'Akce Čtvrteční florbal má nové místo'],
    [['TIME', 'PLACE'], 'Akce Čtvrteční florbal má nový čas i místo'],
  ] as const)('a change of %j is critical', (changes, subject) => {
    const email = notificationEmailOf(
      aNotification({
        type: 'EVENT_CHANGED',
        payload: { changes: [...changes] },
      }),
    );

    expect(email).toEqual(
      expect.objectContaining({ subject, path: '/events/e1', critical: true }),
    );
  });

  it('a cancellation is critical', () => {
    expect(
      notificationEmailOf(aNotification({ type: 'EVENT_CANCELLED' })),
    ).toEqual(
      expect.objectContaining({
        subject: 'Akce Čtvrteční florbal byla zrušena',
        critical: true,
      }),
    );
  });

  it('tells a group’s admins and leads to the group’s requests', () => {
    expect(notificationEmailOf(aNotification(aboutGroup))).toEqual(
      expect.objectContaining({
        subject: 'Honza žádá o členství ve skupině Běžci z Letné',
        path: '/groups/g1/members?tab=requests',
      }),
    );
  });

  it('tells an applicant the group’s decision', () => {
    const email = notificationEmailOf(
      aNotification({
        ...aboutGroup,
        type: 'REQUEST_DECIDED',
        payload: { decision: 'REJECTED', message: 'Jen pro členy oddílu.' },
      }),
    );

    expect(email).toEqual(
      expect.objectContaining({
        subject:
          'Tvoje žádost o členství ve skupině Běžci z Letné byla zamítnuta',
        quote: {
          label: 'Zpráva od správce skupiny:',
          text: 'Jen pro členy oddílu.',
        },
        path: '/groups/g1',
      }),
    );
  });

  it('has no e-mail for a type nothing creates yet', () => {
    expect(
      notificationEmailOf(aNotification({ type: 'SPOT_AVAILABLE' })),
    ).toBeNull();
  });

  it('has no e-mail when the event or group is gone', () => {
    expect(
      notificationEmailOf(aNotification({ event: null, group: null })),
    ).toBeNull();
  });
});
