import { Inject } from '@nestjs/common';
import { OutgoingEmail } from './email-delivery';

/**
 * F-09.5, ADR-0016: where the app hands an e-mail over. It is not sent here:
 * the outbox keeps it and the poller sends it when the limits allow, again
 * after a temporary failure. Resolves once the e-mail is safely queued.
 */
export interface EmailOutbox {
  enqueue(emails: readonly OutgoingEmail[]): Promise<void>;
}

export const EMAIL_OUTBOX = 'EmailOutbox';

export const InjectEmailOutbox = (): ParameterDecorator & PropertyDecorator =>
  Inject(EMAIL_OUTBOX);
