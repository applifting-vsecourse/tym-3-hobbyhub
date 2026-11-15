import { dueEventReminders } from '@/modules/event/domain/event-reminder';
import { EventReminderRepository } from '@/modules/event/repositories/event-reminder.repository';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * #233, ADR-0021: the reminder poller. Every minute (`@nestjs/schedule`) it
 * looks at the events starting within a day, sends the reminders that are due
 * (24 h and 2 h before the start) and marks each as sent for that start, so
 * none goes twice. One backend instance runs it; two passes never overlap.
 */
@Injectable()
export class EventRemindersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EventRemindersService.name);
  // The scheduler starts a pass every minute whether the last one ended or
  // not; this keeps them from overlapping.
  private running = false;

  constructor(
    private readonly repository: EventReminderRepository,
    private readonly notifications: NotificationsService,
  ) {}

  // Right away on start too: what fell due while the backend was down (a
  // deploy) goes now, not at the next minute.
  onApplicationBootstrap(): void {
    void this.tick();
  }

  // The story allows ~15 minutes of delay; a minute keeps well inside it for
  // one cheap query. Its own method without parameters: cron calls it with an
  // argument of its own, which `tick` would take for `now`.
  @Cron(CronExpression.EVERY_MINUTE, { name: 'event-reminders' })
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
      if (sent > 0) this.logger.log(`${sent} event reminder(s) sent`);
    } catch (error) {
      this.logger.error(
        `Event reminder pass failed: ${errorMessageOf(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }

  // Returns how many reminders went out. A reminder is claimed before it is
  // sent: should recording it fail, it is lost rather than sent twice
  // (ADR-0015), and NotificationsService logs why.
  private async sendDue(now: Date): Promise<number> {
    const candidates = await this.repository.findCandidates(now);
    let sent = 0;
    for (const event of candidates) {
      for (const reminder of dueEventReminders(event, now)) {
        const claimed = await this.repository.claim(
          event.id,
          reminder,
          event.startAt,
        );
        if (!claimed) continue;
        await this.notifications.notifyEventReminder({
          event: { id: event.id },
          reminder,
          startAt: event.startAt,
          organizerIds: event.organizerIds,
          participantIds: event.participantIds,
          occupancy: event.occupancy,
        });
        sent += 1;
      }
    }
    return sent;
  }
}
