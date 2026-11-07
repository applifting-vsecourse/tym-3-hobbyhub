import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { OutgoingEmail } from './email-delivery';
import { EmailOutbox } from './email-outbox.interface';

// An outbox without the queue: hands each e-mail to the adapter right away.
// For the seed, whose sign-ups would otherwise leave rows the running
// backend's poller then sends to the seeded @example.com addresses.
export class ImmediateEmailOutbox implements EmailOutbox {
  constructor(private readonly emailService: EmailService) {}

  async enqueue(emails: readonly OutgoingEmail[]): Promise<void> {
    for (const email of emails) {
      if (email.skipReason) continue;
      await this.emailService.sendEmail(email.to, email.subject, email.html);
    }
  }
}
