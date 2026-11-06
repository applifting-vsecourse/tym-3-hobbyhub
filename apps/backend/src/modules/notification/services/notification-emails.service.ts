import { OutgoingEmail } from '@/core/email/outbox/email-delivery';
import {
  EmailOutbox,
  InjectEmailOutbox,
} from '@/core/email/outbox/email-outbox.interface';
import { renderEmail } from '@/core/email/render';
import { NotificationEmail } from '@/core/email/templates/notification';
import {
  NotificationEmailContent,
  notificationEmailOf,
} from '@/modules/notification/domain/notification-email';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { Config } from '@/shared/config/config.service';
import { Injectable } from '@nestjs/common';

/**
 * F-09.5, ADR-0016: turns freshly recorded notifications into e-mails and
 * hands them to the outbox, one per notification. An address its owner has
 * not verified gets none: the row is kept as skipped, without HTML, and the
 * bell still shows the notification. `disabledNotifications` is not looked
 * at yet (F-04.3).
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
    // The e-mail names nobody, so every participant of a cancelled event
    // gets the same one: it is rendered once.
    const rendered = new Map<string, Promise<string>>();
    const htmlOf = (content: NotificationEmailContent): Promise<string> => {
      const key = `${content.heading}\n${content.path}`;
      let html = rendered.get(key);
      if (!html) {
        html = this.render(content);
        rendered.set(key, html);
      }
      return html;
    };

    const emails = await Promise.all(
      notifications.flatMap((notification) => {
        const content = notificationEmailOf(notification);
        if (!content) return [];
        const verified = notification.recipient.emailVerified;
        const html = verified ? htmlOf(content) : Promise.resolve('');
        return html.then((html): OutgoingEmail => ({
          kind: 'NOTIFICATION',
          critical: content.critical,
          recipientId: notification.recipientId,
          to: notification.recipient.email,
          subject: content.subject,
          html,
          notificationId: notification.id,
          ...(verified ? {} : { skipReason: 'UNVERIFIED' as const }),
        }));
      }),
    );
    await this.outbox.enqueue(emails);
  }

  private render(content: NotificationEmailContent): Promise<string> {
    return renderEmail(NotificationEmail, {
      heading: content.heading,
      body: content.body,
      buttonLabel: content.buttonLabel,
      url: `${this.config.frontendUrl}${content.path}`,
      notificationsUrl: `${this.config.frontendUrl}/notifications`,
    });
  }
}
