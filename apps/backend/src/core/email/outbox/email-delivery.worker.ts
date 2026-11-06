import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { Config } from '@/shared/config/config.service';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  DAY_MS,
  DueEmail,
  EmailBudget,
  errorMessageOf,
  HOUR_MS,
  isPermanentFailure,
  MAX_ATTEMPTS,
  nextAttemptAt,
  sendableNow,
} from './email-delivery';
import { EmailDeliveryRepository } from './email-delivery.repository';

// How many due e-mails one pass looks at; the rest wait for the next pass.
const BATCH_SIZE = 20;

/**
 * F-09.5, ADR-0016: the poller. Every few seconds it sends what is due in the
 * outbox: critical e-mails first, within the daily budget and the cap per
 * recipient, and records how each attempt ended. One backend instance runs
 * it; two passes never overlap.
 */
@Injectable()
export class EmailDeliveryWorker
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(EmailDeliveryWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly repository: EmailDeliveryRepository,
    @Inject('EmailService') private readonly emailService: EmailService,
    private readonly config: Config,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const released = await this.repository.releaseInterrupted();
    if (released > 0) {
      this.logger.warn(
        `${released} e-mail(s) interrupted by a restart go again`,
      );
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, this.config.emailPollIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // One pass. Public so the tests drive it; never throws, the next pass
  // simply tries again.
  async tick(now: Date = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.sendDue(now);
    } catch (error) {
      this.logger.error(
        `E-mail outbox pass failed: ${errorMessageOf(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }

  private get budget(): EmailBudget {
    return {
      dailyLimit: this.config.emailDailyLimit,
      criticalReservePercent: this.config.emailCriticalReservePercent,
    };
  }

  private async sendDue(now: Date): Promise<void> {
    let sent = await this.repository.countSentSince(
      new Date(now.getTime() - DAY_MS),
    );
    const allowed = sendableNow(sent, this.budget);
    if (allowed === 'NONE') return;

    const due = await this.repository.findDue(now, {
      criticalOnly: allowed === 'CRITICAL_ONLY',
      limit: BATCH_SIZE,
    });
    for (const email of due) {
      // Each send uses the budget up a little: the next one may not fit.
      const stillAllowed = sendableNow(sent, this.budget);
      if (stillAllowed === 'NONE') return;
      if (stillAllowed === 'CRITICAL_ONLY' && !email.critical) continue;

      if (!(await this.repository.claim(email.id))) continue;
      if (await this.overRecipientCap(email, now)) {
        await this.repository.markSkipped(email.id, 'RECIPIENT_CAP');
        continue;
      }
      if (await this.send(email, now)) sent += 1;
    }
  }

  // Abuse protection: someone who requests and withdraws over and over must
  // not flood the organizer's inbox. Over the cap the bell still has it.
  private async overRecipientCap(email: DueEmail, now: Date): Promise<boolean> {
    if (email.critical) return false;
    const sentLastHour = await this.repository.countNonCriticalSentToSince(
      email.recipientId,
      new Date(now.getTime() - HOUR_MS),
    );
    return sentLastHour >= this.config.emailRecipientHourlyLimit;
  }

  // True when it went.
  private async send(email: DueEmail, now: Date): Promise<boolean> {
    const attempts = email.attempts + 1;
    let messageId: string | null;
    try {
      ({ messageId } = await this.emailService.sendEmail(
        email.to,
        email.subject,
        email.html,
      ));
    } catch (error) {
      const message = errorMessageOf(error);
      const retryAt = isPermanentFailure(error)
        ? null
        : nextAttemptAt(attempts, now);
      if (retryAt) {
        this.logger.warn(
          `E-mail ${email.id} failed (attempt ${attempts}/${MAX_ATTEMPTS}), next at ${retryAt.toISOString()}: ${message}`,
        );
        await this.repository.markRetry(email.id, attempts, retryAt, message);
      } else {
        this.logger.error(
          `E-mail ${email.id} failed for good after ${attempts} attempt(s): ${message}`,
        );
        await this.repository.markFailed(email.id, attempts, message);
      }
      return false;
    }
    // Outside the try: the provider has it, so a failed write is not a failed
    // send and must not queue it again. The row stays SENDING; the pass logs
    // the error.
    await this.repository.markSent(email.id, attempts, messageId, now);
    return true;
  }
}
