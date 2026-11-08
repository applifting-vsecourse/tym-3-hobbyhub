import { PrismaService } from '@/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { DueEmail, EmailSkipReason, OutgoingEmail } from './email-delivery';

// F-09.5, ADR-0018: the only place that touches the `email_delivery` table.
// It validates nothing; the outbox and the poller decide.
@Injectable()
export class EmailDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // One row per e-mail. A second e-mail for the same notification is dropped
  // by the unique index, so a notification is never e-mailed twice.
  async createMany(emails: readonly OutgoingEmail[], now: Date): Promise<void> {
    if (emails.length === 0) return;
    await this.prisma.emailDelivery.createMany({
      data: emails.map((email) => ({
        kind: email.kind,
        critical: email.critical,
        status: email.skipReason ? 'SKIPPED' : 'PENDING',
        skipReason: email.skipReason ?? null,
        recipientId: email.recipientId,
        toAddress: email.to,
        subject: email.subject,
        html: email.html,
        notificationId: email.notificationId ?? null,
        createdAt: now,
        nextAttemptAt: now,
      })),
      skipDuplicates: true,
    });
  }

  // What is due now: critical first, then oldest first.
  async findDue(
    now: Date,
    options: { criticalOnly: boolean; limit: number },
  ): Promise<DueEmail[]> {
    const rows = await this.prisma.emailDelivery.findMany({
      where: {
        status: 'PENDING',
        nextAttemptAt: { lte: now },
        ...(options.criticalOnly ? { critical: true } : {}),
      },
      orderBy: [{ critical: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: options.limit,
      select: {
        id: true,
        critical: true,
        recipientId: true,
        toAddress: true,
        subject: true,
        html: true,
        attempts: true,
      },
    });
    return rows.map(({ toAddress, ...row }) => ({ ...row, to: toAddress }));
  }

  // Takes the e-mail for sending; false when something else took it first.
  async claim(id: string): Promise<boolean> {
    const { count } = await this.prisma.emailDelivery.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'SENDING' },
    });
    return count === 1;
  }

  // On start nothing is being sent: whatever a stopped backend left SENDING
  // goes back to the queue. If it did reach the provider before the stop, it
  // goes once more (ADR-0018).
  async releaseInterrupted(): Promise<number> {
    const { count } = await this.prisma.emailDelivery.updateMany({
      where: { status: 'SENDING' },
      data: { status: 'PENDING' },
    });
    return count;
  }

  countSentSince(since: Date): Promise<number> {
    return this.prisma.emailDelivery.count({
      where: { status: 'SENT', sentAt: { gte: since } },
    });
  }

  countNonCriticalSentToSince(
    recipientId: string,
    since: Date,
  ): Promise<number> {
    return this.prisma.emailDelivery.count({
      where: {
        recipientId,
        critical: false,
        status: 'SENT',
        sentAt: { gte: since },
      },
    });
  }

  // Once an e-mail is done, its HTML goes: it may hold a password-reset or
  // verification link. The subject, the outcome and the metadata stay.
  async markSent(
    id: string,
    attempts: number,
    providerMessageId: string | null,
    at: Date,
  ): Promise<void> {
    await this.prisma.emailDelivery.update({
      where: { id },
      data: {
        status: 'SENT',
        attempts,
        providerMessageId,
        sentAt: at,
        html: '',
      },
    });
  }

  async markRetry(
    id: string,
    attempts: number,
    nextAttemptAt: Date,
    error: string,
  ): Promise<void> {
    await this.prisma.emailDelivery.update({
      where: { id },
      data: { status: 'PENDING', attempts, nextAttemptAt, lastError: error },
    });
  }

  async markFailed(id: string, attempts: number, error: string): Promise<void> {
    await this.prisma.emailDelivery.update({
      where: { id },
      data: { status: 'FAILED', attempts, lastError: error, html: '' },
    });
  }

  async markSkipped(id: string, reason: EmailSkipReason): Promise<void> {
    await this.prisma.emailDelivery.update({
      where: { id },
      data: { status: 'SKIPPED', skipReason: reason, html: '' },
    });
  }
}
