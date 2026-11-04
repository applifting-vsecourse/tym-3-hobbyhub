import { OutgoingEmail } from '@/core/email/outbox/email-delivery';
import { EmailOutbox } from '@/core/email/outbox/email-outbox.interface';
import { NotificationForEmail } from '@/modules/notification/domain/notification-email';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { Config } from '@/shared/config/config.service';
import { mock, MockProxy } from 'jest-mock-extended';
import { NotificationEmailsService } from './notification-emails.service';

// react-email renders through a dynamic import Jest cannot run; the props the
// template gets stand in for the HTML.
jest.mock('@/core/email/render', () => ({
  renderEmail: (_component: unknown, props: object): Promise<string> =>
    Promise.resolve(JSON.stringify(props)),
}));

const aNotification = (
  overrides: Partial<NotificationForEmail> = {},
): NotificationForEmail => ({
  id: 'n1',
  type: 'REQUEST_DECIDED',
  payload: { decision: 'REJECTED', message: 'Je plno.' },
  createdAt: new Date('2030-01-01T12:00:00Z'),
  readAt: null,
  recipientId: 'u1',
  actor: { id: 'u2', name: 'Honza' },
  event: { id: 'e1', title: 'Čtvrteční florbal' },
  group: null,
  recipient: { email: 'jana@example.com', emailVerified: true },
  ...overrides,
});

describe('NotificationEmailsService', () => {
  const setup = (
    notifications: NotificationForEmail[],
  ): {
    repository: MockProxy<NotificationRepository>;
    outbox: MockProxy<EmailOutbox>;
    service: NotificationEmailsService;
    queued: () => OutgoingEmail[];
  } => {
    const repository = mock<NotificationRepository>();
    repository.findForEmail.mockResolvedValue(notifications);
    const outbox = mock<EmailOutbox>();
    outbox.enqueue.mockResolvedValue();
    const config = { frontendUrl: 'https://hobbyhub.test' } as Config;
    return {
      repository,
      outbox,
      service: new NotificationEmailsService(repository, outbox, config),
      queued: () => [...(outbox.enqueue.mock.calls[0]?.[0] ?? [])],
    };
  };

  it('queues one e-mail per notification, to its recipient', async () => {
    const { service, queued } = setup([aNotification()]);

    await service.queueFor(['n1']);

    expect(queued()).toEqual([
      expect.objectContaining({
        kind: 'NOTIFICATION',
        critical: false,
        recipientId: 'u1',
        to: 'jana@example.com',
        subject:
          'Tvoje žádost o účast na akci Čtvrteční florbal byla zamítnuta',
        notificationId: 'n1',
      }),
    ]);
    expect(queued()[0].skipReason).toBeUndefined();
  });

  it('renders the text with links to the app and the overview', async () => {
    const { service, queued } = setup([aNotification()]);

    await service.queueFor(['n1']);

    expect(JSON.parse(queued()[0].html)).toEqual({
      heading: 'Tvoje žádost o účast na akci Čtvrteční florbal byla zamítnuta',
      quote: { label: 'Zpráva od organizátora:', text: 'Je plno.' },
      buttonLabel: 'Zobrazit akci',
      url: 'https://hobbyhub.test/events/e1',
      notificationsUrl: 'https://hobbyhub.test/notifications',
    });
  });

  it('records, but never sends, an e-mail to an unverified address', async () => {
    const { service, queued } = setup([
      aNotification({
        recipient: { email: 'jana@example.com', emailVerified: false },
      }),
    ]);

    await service.queueFor(['n1']);

    expect(queued()[0].skipReason).toBe('UNVERIFIED');
  });

  it('leaves out a notification that has no e-mail', async () => {
    const { service, queued } = setup([
      aNotification({ id: 'n1', type: 'SPOT_AVAILABLE' }),
      aNotification({ id: 'n2', type: 'EVENT_CANCELLED', payload: {} }),
    ]);

    await service.queueFor(['n1', 'n2']);

    expect(queued().map((email) => email.notificationId)).toEqual(['n2']);
    expect(queued()[0].critical).toBe(true);
  });
});
