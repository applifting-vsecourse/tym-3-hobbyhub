import { PrismaModule } from '@/core/prisma/prisma.module';
import { Config } from '@/shared/config/config.service';
import { Global, Module } from '@nestjs/common';
import { ConsoleMailerAdapterFactory } from './adapters/console-mailer/console-mailer.adapter.factory';
import { ResendAdapterFactory } from './adapters/resend/resend.adapter.factory';
import { SMTPAdapterFactory } from './adapters/smtp/smtp.adapter.factory';
import { EmailModule } from './email.module';
import { DatabaseEmailOutbox } from './outbox/database-email-outbox';
import { EmailDeliveryRepository } from './outbox/email-delivery.repository';
import { EmailDeliveryWorker } from './outbox/email-delivery.worker';
import { EMAIL_OUTBOX } from './outbox/email-outbox.interface';

/**
 * Picks an email adapter based on env:
 *   RESEND_API_KEY set           → Resend
 *   SMTP_HOST + USERNAME + PASS  → SMTP
 *   otherwise                    → Console (logs emails to stdout, dev only)
 *
 * F-09.5, ADR-0018: the app does not call the adapter itself. It hands every
 * e-mail to the `'EmailOutbox'` (`@InjectEmailOutbox()`), which keeps it in
 * the database, and the poller here sends it through the adapter.
 */
@Global()
@Module({
  imports: [
    PrismaModule,
    EmailModule.forRootAsync({
      useFactory: async (...args: unknown[]) => {
        const config = args[0] as Config;
        if (config.resendApiKey) {
          return ResendAdapterFactory.create({
            apiKey: config.resendApiKey,
            from: config.emailFrom,
          });
        }
        if (config.smtpHost && config.smtpUsername && config.smtpPassword) {
          return SMTPAdapterFactory.create({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpSecure,
            user: config.smtpUsername,
            pass: config.smtpPassword,
            from: config.smtpFrom,
          });
        }
        return ConsoleMailerAdapterFactory.create();
      },
      inject: [Config],
    }),
  ],
  providers: [
    EmailDeliveryRepository,
    EmailDeliveryWorker,
    { provide: EMAIL_OUTBOX, useClass: DatabaseEmailOutbox },
  ],
  exports: [EmailModule, EMAIL_OUTBOX],
})
export class MailModule {}
