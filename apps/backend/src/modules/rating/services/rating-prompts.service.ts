import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { ratingDeadlineOf } from '@/modules/rating/domain/rating';
import {
  dueRatingPrompt,
  ratingPromptRecipients,
} from '@/modules/rating/domain/rating-prompt';
import { RatingPromptRepository } from '@/modules/rating/repositories/rating-prompt.repository';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * #236, ADR-0021, ADR-0027: the calls to rate an event. Every five minutes
 * (`@nestjs/schedule`) it looks at the events whose rating period is on,
 * sends the call that is due (two hours after the end, then on the last day)
 * and marks it as sent, so none goes twice. What fell due while the backend
 * was down goes on the next pass, as long as the period lasts.
 */
@Injectable()
export class RatingPromptsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RatingPromptsService.name);
  // The scheduler starts a pass whether the last one ended or not; this keeps
  // them from overlapping.
  private running = false;

  constructor(
    private readonly repository: RatingPromptRepository,
    private readonly notifications: NotificationsService,
    private readonly blocks: UserBlockVisibility,
  ) {}

  onApplicationBootstrap(): void {
    void this.tick();
  }

  // Two hours after the end, a few minutes do not matter. Its own method
  // without parameters: cron calls it with an argument of its own, which
  // `tick` would take for `now`.
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'rating-prompts' })
  async onSchedule(): Promise<void> {
    await this.tick();
  }

  // One pass. Public so the tests drive it; never throws, the next pass
  // simply tries again.
  async tick(now: Date = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const sent = await this.sendDue(now);
      if (sent > 0) this.logger.log(`${sent} rating prompt(s) sent`);
    } catch (error) {
      this.logger.error(
        `Rating prompt pass failed: ${errorMessageOf(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }

  // A call is claimed before it is sent: should sending fail, it is lost
  // rather than sent twice (ADR-0015), and NotificationsService logs why.
  private async sendDue(now: Date): Promise<number> {
    const candidates = await this.repository.findCandidates(now);
    let sent = 0;
    for (const event of candidates) {
      const kind = dueRatingPrompt(event, now);
      if (!kind) continue;
      if (!(await this.repository.claim(event.id, kind))) continue;
      const recipients = ratingPromptRecipients(
        event,
        kind,
        await this.blocks.hiddenFrom(event.organizerId),
      );
      await this.notifications.notifyRatingPrompt({
        event: { id: event.id },
        prompt: kind,
        deadline: ratingDeadlineOf(event.endAt),
        ...recipients,
      });
      sent += 1;
    }
    return sent;
  }
}
