import { OutgoingEmail } from '@/core/email/outbox/email-delivery';
import {
  EmailOutbox,
  InjectEmailOutbox,
} from '@/core/email/outbox/email-outbox.interface';
import { renderEmail } from '@/core/email/render';
import { NotificationEmail } from '@/core/email/templates/notification';
import { notificationEmailOf } from '@/modules/notification/domain/notification-email';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { Config } from '@/shared/config/config.service';
import { Injectable } from '@nestjs/common';

/**
 * F-09.5, ADR-0016: turns freshly recorded notifications into e-mails and
 * hands them to the outbox, one per notification. An address its owner has
 * not verified gets none: the row is kept as skipped, the bell still shows
 * the notification. `disabledNotifications` is not looked at yet (F-04.3).
 */
@Injectable()
export class NotificationEmailsService {
  constructor(
    private readonly repository: NotificationRepository,
    @InjectEmailOutbox() private readonly outbox: EmailOutbox,
    private readonly config: Config,
  ) {}

  async queueFor(notificationIds: readonly string[]): Promise<void> {
    const notifications = await this.repository.findForEmail(notificationIds);
    const emails: OutgoingEmail[] = [];
    for (const notification of notifications) {
      const content = notificationEmailOf(notification);
      if (!content) continue;
      const html = await renderEmail(NotificationEmail, {
        heading: content.heading,
        body: content.body,
        quote: content.quote,
        buttonLabel: content.buttonLabel,
        url: `${this.config.frontendUrl}${content.path}`,
        notificationsUrl: `${this.config.frontendUrl}/notifications`,
      });
      emails.push({
        kind: 'NOTIFICATION',
        critical: content.critical,
        recipientId: notification.recipientId,
        to: notification.recipient.email,
        subject: content.subject,
        html,
        notificationId: notification.id,
        ...(notification.recipient.emailVerified
          ? {}
          : { skipReason: 'UNVERIFIED' as const }),
      });
    }
    await this.outbox.enqueue(emails);
  }
}
