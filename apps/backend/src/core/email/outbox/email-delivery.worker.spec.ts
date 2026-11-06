import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { Config } from '@/shared/config/config.service';
import { Logger } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { DueEmail } from './email-delivery';
import { EmailDeliveryRepository } from './email-delivery.repository';
import { EmailDeliveryWorker } from './email-delivery.worker';

const now = new Date('2030-01-01T12:00:00Z');

const aDueEmail = (overrides: Partial<DueEmail> = {}): DueEmail => ({
  id: 'd1',
  critical: false,
  recipientId: 'u1',
  to: 'jana@example.com',
  subject: 'Předmět',
  html: '<p>x</p>',
  attempts: 0,
  ...overrides,
});

describe('EmailDeliveryWorker', () => {
  let logs: jest.SpyInstance[];
  beforeEach(() => {
    logs = [
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined),
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined),
    ];
  });
  afterEach(() => logs.forEach((spy) => spy.mockRestore()));

  const setup = (
    due: DueEmail[],
    { sentToday = 0, sentToRecipient = 0, dailyLimit = 200 } = {},
  ): {
    repository: MockProxy<EmailDeliveryRepository>;
    emailService: MockProxy<EmailService>;
    worker: EmailDeliveryWorker;
  } => {
    const repository = mock<EmailDeliveryRepository>();
    repository.countSentSince.mockResolvedValue(sentToday);
    repository.findDue.mockResolvedValue(due);
    repository.claim.mockResolvedValue(true);
    repository.countNonCriticalSentToSince.mockResolvedValue(sentToRecipient);
    const emailService = mock<EmailService>();
    emailService.sendEmail.mockResolvedValue({ messageId: 'msg-1' });
    const config = {
      emailDailyLimit: dailyLimit,
      emailCriticalReservePercent: 20,
      emailRecipientHourlyLimit: 10,
      emailPollIntervalMs: 5000,
    } as Config;
    return {
      repository,
      emailService,
      worker: new EmailDeliveryWorker(repository, emailService, config),
    };
  };

  it('sends what is due and records the provider’s id', async () => {
    const { repository, emailService, worker } = setup([aDueEmail()]);

    await worker.tick(now);

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'jana@example.com',
      'Předmět',
      '<p>x</p>',
    );
    expect(repository.markSent).toHaveBeenCalledWith('d1', 1, 'msg-1', now);
  });

  it('does not send an e-mail something else took first', async () => {
    const { repository, emailService, worker } = setup([aDueEmail()]);
    repository.claim.mockResolvedValue(false);

    await worker.tick(now);

    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  describe('a failed send', () => {
    it('is tried again later after a temporary failure', async () => {
      const { repository, emailService, worker } = setup([
        aDueEmail({ attempts: 1 }),
      ]);
      emailService.sendEmail.mockRejectedValue(
        Object.assign(new Error('Try again later'), { responseCode: 421 }),
      );

      await worker.tick(now);

      expect(repository.markRetry).toHaveBeenCalledWith(
        'd1',
        2,
        new Date('2030-01-01T12:05:00Z'),
        'Try again later',
      );
    });

    it('is given up at once when the provider refuses it for good', async () => {
      const { repository, emailService, worker } = setup([aDueEmail()]);
      emailService.sendEmail.mockRejectedValue(
        Object.assign(new Error('No such mailbox'), { responseCode: 550 }),
      );

      await worker.tick(now);

      expect(repository.markFailed).toHaveBeenCalledWith(
        'd1',
        1,
        'No such mailbox',
      );
    });

    it('is given up after the fifth attempt', async () => {
      const { repository, emailService, worker } = setup([
        aDueEmail({ attempts: 4 }),
      ]);
      emailService.sendEmail.mockRejectedValue(new Error('timeout'));

      await worker.tick(now);

      expect(repository.markFailed).toHaveBeenCalledWith('d1', 5, 'timeout');
      expect(repository.markRetry).not.toHaveBeenCalled();
    });
  });

  it('does not send again when the provider took it but recording failed', async () => {
    const { repository, worker } = setup([aDueEmail()]);
    repository.markSent.mockRejectedValue(new Error('db down'));

    await worker.tick(now);

    expect(repository.markRetry).not.toHaveBeenCalled();
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  describe('the daily budget', () => {
    it('lets only critical e-mails use the reserve', async () => {
      const { repository, worker } = setup([], { sentToday: 170 });

      await worker.tick(now);

      expect(repository.findDue).toHaveBeenCalledWith(now, {
        criticalOnly: true,
        limit: 20,
      });
    });

    it('sends nothing once the daily limit is used', async () => {
      const { repository, worker } = setup([aDueEmail({ critical: true })], {
        sentToday: 200,
      });

      await worker.tick(now);

      expect(repository.findDue).not.toHaveBeenCalled();
    });

    it('stops a pass where the sends of that pass reach the reserve', async () => {
      // A limit of 10 keeps 2 for critical e-mails: 7 sent, one more goes.
      const { emailService, worker } = setup(
        [
          aDueEmail({ id: 'a' }),
          aDueEmail({ id: 'b' }),
          aDueEmail({ id: 'c', critical: true }),
        ],
        { sentToday: 7, dailyLimit: 10 },
      );

      await worker.tick(now);

      expect(
        emailService.sendEmail.mock.calls.map((call) => call[1]),
      ).toHaveLength(2);
    });
  });

  describe('the cap per recipient', () => {
    it('skips a non-critical e-mail to someone who had enough this hour', async () => {
      const { repository, emailService, worker } = setup([aDueEmail()], {
        sentToRecipient: 10,
      });

      await worker.tick(now);

      expect(repository.markSkipped).toHaveBeenCalledWith(
        'd1',
        'RECIPIENT_CAP',
      );
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('never holds back a critical one', async () => {
      const { repository, emailService, worker } = setup(
        [aDueEmail({ critical: true })],
        { sentToRecipient: 50 },
      );

      await worker.tick(now);

      expect(repository.countNonCriticalSentToSince).not.toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  it('survives a pass that fails, so the next one tries again', async () => {
    const { repository, worker } = setup([]);
    repository.countSentSince.mockRejectedValue(new Error('db down'));

    await expect(worker.tick(now)).resolves.toBeUndefined();
  });

  it('does not run two passes at once', async () => {
    const { repository, worker } = setup([]);
    let finish: () => void = () => undefined;
    repository.countSentSince.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = (): void => resolve(0);
        }),
    );

    const first = worker.tick(now);
    await worker.tick(now);
    finish();
    await first;

    expect(repository.countSentSince).toHaveBeenCalledTimes(1);
  });
});
