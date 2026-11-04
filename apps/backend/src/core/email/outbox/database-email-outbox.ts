import { Injectable } from '@nestjs/common';
import { OutgoingEmail } from './email-delivery';
import { EmailDeliveryRepository } from './email-delivery.repository';
import { EmailOutbox } from './email-outbox.interface';

// F-09.5, ADR-0016: the app's outbox. An e-mail is a row first; the poller
// (EmailDeliveryWorker) sends it.
@Injectable()
export class DatabaseEmailOutbox implements EmailOutbox {
  constructor(private readonly repository: EmailDeliveryRepository) {}

  enqueue(emails: readonly OutgoingEmail[], now = new Date()): Promise<void> {
    return this.repository.createMany(emails, now);
  }
}
