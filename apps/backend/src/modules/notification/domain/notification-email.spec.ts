import { Notification, NotificationType } from './notification';
import { notificationEmailOf } from './notification-email';

const APPLICANT = 'Honza Novák';
const EVENT_TITLE = 'Čtvrteční florbal';
const GROUP_NAME = 'Běžci z Letné';
const MESSAGE = 'Je plno.';

const aNotification = (
  overrides: Partial<Notification> = {},
): Notification => ({
  id: 'n1',
  type: 'NEW_REQUESTS',
  payload: {},
  createdAt: new Date('2030-01-01T12:00:00Z'),
  readAt: null,
  recipientId: 'u1',
  actor: { id: 'u2', name: APPLICANT },
  event: { id: 'e1', title: EVENT_TITLE },
  group: null,
  ...overrides,
});

const aboutGroup = {
  event: null,
  group: { id: 'g1', name: GROUP_NAME },
};

describe('notificationEmailOf', () => {
  it('tells an organizer there is a request and leads to the requests', () => {
    expect(notificationEmailOf(aNotification())).toEqual(
      expect.objectContaining({
        subject: 'Máš novou žádost o účast na své akci',
        buttonLabel: 'Zobrazit žádosti',
        path: '/events/e1/participants?tab=requests',
        critical: false,
      }),
    );
  });

  it('tells a rejected applicant and leads to the event', () => {
    expect(
      notificationEmailOf(
        aNotification({
          type: 'REQUEST_DECIDED',
          payload: { decision: 'REJECTED', message: MESSAGE },
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        subject: 'Tvoje žádost o účast na akci byla zamítnuta',
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

    expect(email?.subject).toBe('Tvoje žádost o účast na akci byla schválena');
    expect(email?.critical).toBe(false);
  });

  it.each([
    [['TIME'], 'Akce, na kterou jdeš, má nový čas'],
    [['PLACE'], 'Akce, na kterou jdeš, má nové místo'],
    [['TIME', 'PLACE'], 'Akce, na kterou jdeš, má nový čas i místo'],
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
        subject: 'Akce, na kterou jdeš, byla zrušena',
        critical: true,
      }),
    );
  });

  // F-09.2 (#58).
  it('tells an organizer a participant cancelled and leads to the event', () => {
    expect(
      notificationEmailOf(
        aNotification({
          type: 'PARTICIPANT_CANCELLED',
          payload: { message: MESSAGE },
        }),
      ),
    ).toEqual({
      subject: 'Účastník se odhlásil z tvé akce',
      heading: 'Účastník se odhlásil z tvé akce',
      body: 'Uvolnilo se místo. Kdo to byl a proč, najdeš v přehledu účastníků akce.',
      buttonLabel: 'Zobrazit akci',
      path: '/events/e1',
      critical: false,
    });
  });

  // F-09.3 (#59): every e-mail to an applicant or a participant leads to the
  // event as it is now; only a change and a cancellation are critical, so
  // nobody comes for nothing.
  it.each<[NotificationType, Notification['payload'], boolean]>([
    ['REQUEST_DECIDED', { decision: 'APPROVED' }, false],
    ['REQUEST_DECIDED', { decision: 'REJECTED', message: MESSAGE }, false],
    ['EVENT_CHANGED', { changes: ['TIME'] }, true],
    ['EVENT_CHANGED', { changes: ['PLACE'] }, true],
    ['EVENT_CHANGED', { changes: ['TIME', 'PLACE'] }, true],
    ['EVENT_CANCELLED', {}, true],
  ])(
    '%s %j leads to the event detail, critical: %s',
    (type, payload, critical) => {
      expect(notificationEmailOf(aNotification({ type, payload }))).toEqual(
        expect.objectContaining({
          buttonLabel: 'Zobrazit akci',
          path: '/events/e1',
          critical,
        }),
      );
    },
  );

  it('tells a group’s admins and leads to the group’s requests', () => {
    expect(notificationEmailOf(aNotification(aboutGroup))).toEqual(
      expect.objectContaining({
        subject: 'Máš novou žádost o členství ve své skupině',
        path: '/groups/g1/members?tab=requests',
      }),
    );
  });

  it('tells an applicant the group’s decision', () => {
    expect(
      notificationEmailOf(
        aNotification({
          ...aboutGroup,
          type: 'REQUEST_DECIDED',
          payload: { decision: 'REJECTED', message: MESSAGE },
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        subject: 'Tvoje žádost o členství ve skupině byla zamítnuta',
        path: '/groups/g1',
      }),
    );
  });

  // The visibility matrix: an e-mail carries only the reason and a link,
  // never a name, a title or someone's message.
  describe.each<[string, Partial<Notification>]>([
    ['an event', {}],
    ['a group', aboutGroup],
  ])('about %s, it names nobody and nothing', (_about, target) => {
    it.each<[NotificationType, Notification['payload']]>([
      ['NEW_REQUESTS', {}],
      ['REQUEST_DECIDED', { decision: 'REJECTED', message: MESSAGE }],
      ['REQUEST_DECIDED', { decision: 'APPROVED', message: MESSAGE }],
      ['EVENT_CHANGED', { changes: ['TIME', 'PLACE'] }],
      ['EVENT_CANCELLED', {}],
      ['PARTICIPANT_CANCELLED', { message: MESSAGE }],
    ])('%s %j', (type, payload) => {
      const text = JSON.stringify(
        notificationEmailOf(aNotification({ ...target, type, payload })),
      );

      for (const secret of [APPLICANT, EVENT_TITLE, GROUP_NAME, MESSAGE]) {
        expect(text).not.toContain(secret);
      }
    });
  });

  describe('an event an administrator hid (#239)', () => {
    it('tells an organizer, without the reason, and leads to the event', () => {
      const email = notificationEmailOf(
        aNotification({
          type: 'EVENT_HIDDEN',
          actor: null,
          payload: { reason: 'Nabízí placené služby.' },
        }),
      );

      expect(email).toEqual(
        expect.objectContaining({
          subject: 'Tvoji akci skryl správce',
          path: '/events/e1',
          critical: true,
        }),
      );
      expect(JSON.stringify(email)).not.toContain('Nabízí placené služby.');
    });

    it('tells a participant it is gone and leads to their own events', () => {
      const email = notificationEmailOf(
        aNotification({ type: 'EVENT_HIDDEN', actor: null }),
      );

      expect(email).toEqual(
        expect.objectContaining({
          subject: 'Akce, kterou máš v přehledu, byla odstraněna',
          path: '/my-events',
        }),
      );
      expect(JSON.stringify(email)).not.toContain(EVENT_TITLE);
    });

    it('tells everyone when it is back', () => {
      expect(
        notificationEmailOf(
          aNotification({ type: 'EVENT_RESTORED', actor: null }),
        ),
      ).toEqual(
        expect.objectContaining({
          subject: 'Akce, kterou máš v přehledu, je zpět',
          path: '/events/e1',
          critical: false,
        }),
      );
    });
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
