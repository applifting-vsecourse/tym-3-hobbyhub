import { SMTPConfig } from '@/core/email/adapters/smtp/interfaces/smtp-config.interface';
import {
  EmailService,
  SentEmail,
} from '@/core/email/interfaces/email-service.interface';
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SMTPAdapter implements EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: SMTPConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  // A refusal rejects with nodemailer's error, which carries the SMTP reply
  // code; the outbox tells a permanent one from a temporary one by it.
  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<SentEmail> {
    const info = (await this.transporter.sendMail({
      // An empty SMTP_FROM counts as unset.
      from: this.config.from || this.config.user,
      to,
      subject,
      html,
    })) as { messageId?: string } | undefined;
    return { messageId: info?.messageId ?? null };
  }
}
