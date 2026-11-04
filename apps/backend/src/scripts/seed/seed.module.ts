import { ConsoleMailerAdapterFactory } from '@/core/email/adapters/console-mailer/console-mailer.adapter.factory';
import { EmailModule } from '@/core/email/email.module';
import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { EMAIL_OUTBOX } from '@/core/email/outbox/email-outbox.interface';
import { ImmediateEmailOutbox } from '@/core/email/outbox/immediate-email-outbox';
import { PrismaService } from '@/core/prisma/prisma.service';
import { betterAuthProvider } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRootAsync(Config, { validate: true }),
    EmailModule.forRootAsync({
      useFactory: async () => {
        return ConsoleMailerAdapterFactory.create();
      },
      inject: [Config],
    }),
  ],
  providers: [
    Config,
    PrismaService,
    // The seed's sign-ups print their e-mails right away instead of queuing
    // them for the running backend to send to @example.com (ADR-0016).
    {
      provide: EMAIL_OUTBOX,
      useFactory: (emailService: EmailService): ImmediateEmailOutbox =>
        new ImmediateEmailOutbox(emailService),
      inject: ['EmailService'],
    },
    betterAuthProvider,
    SeedService,
  ],
})
export class SeedModule {}
