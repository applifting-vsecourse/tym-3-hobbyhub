import {
  EMAIL_OUTBOX,
  EmailOutbox,
} from '@/core/email/outbox/email-outbox.interface';
import { renderEmail } from '@/core/email/render';
import {
  RESET_PASSWORD_SUBJECT,
  ResetPassword,
} from '@/core/email/templates/reset-password';
import {
  VERIFY_EMAIL_SUBJECT,
  VerifyEmail,
} from '@/core/email/templates/verify-email';
import { PrismaService } from '@/core/prisma/prisma.service';
import { betterAuthCoreConfig } from '@/shared/auth/config/better-auth.config';
import {
  registrationBeforeHook,
  registrationDatabaseHooks,
} from '@/shared/auth/registration/registration.hooks';
import { resendCooldown } from '@/shared/auth/verification/resend-cooldown';
import { sendOnceAMinute } from '@/shared/auth/verification/send-once-a-minute';
import { Config } from '@/shared/config/config.service';
import { Inject, Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const VERIFICATION_LINK_TTL_SECONDS = 24 * 60 * 60;

const createAuth = (
  prismaService: PrismaService,
  config: Config,
  emailOutbox: EmailOutbox,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
  betterAuth({
    // Without this better-auth can only guess its own URL from the request,
    // which breaks callbacks and links built outside a request (e.g. the seed).
    baseURL: config.backendUrl,
    database: prismaAdapter(prismaService, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, token }) => {
        const passwordResetUrl = `${config.frontendUrl}/${config.frontendResetPasswordUrl}?token=${token}`;
        const html = await renderEmail(ResetPassword, {
          username: user.name,
          url: passwordResetUrl,
        });
        // F-09.5: through the outbox, critical: retried, and never held
        // back by the limits for the other e-mails (ADR-0018).
        await emailOutbox.enqueue([
          {
            kind: 'RESET_PASSWORD',
            critical: true,
            recipientId: user.id,
            to: user.email,
            subject: RESET_PASSWORD_SUBJECT,
            html,
          },
        ]);
      },
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: true,
          defaultValue: 'user',
          input: false,
        },
      },
    },
    trustedOrigins: [config.frontendUrl],
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // F-03.2: once a minute per address, the registration's e-mail too.
        await sendOnceAMinute(resendCooldown, user.email, async () => {
          const html = await renderEmail(VerifyEmail, { url });
          await emailOutbox.enqueue([
            {
              kind: 'VERIFY_EMAIL',
              critical: true,
              recipientId: user.id,
              to: user.email,
              subject: VERIFY_EMAIL_SUBJECT,
              html,
            },
          ]);
        });
      },
      sendOnSignUp: true,
      // F-03.2: the link is valid for a day (BetterAuth's default is an hour).
      expiresIn: VERIFICATION_LINK_TTL_SECONDS,
    },
    hooks: {
      before: registrationBeforeHook,
    },
    databaseHooks: registrationDatabaseHooks,
    // On in every environment, not just production (BetterAuth's default).
    // Sign-up gets a much tighter limit against bulk account creation.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-up/email': { window: 60, max: 3 },
      },
    },
    // If change (setup) affects database, must be in core config, in order to be able to run migrations
    ...betterAuthCoreConfig,
    plugins: [...(betterAuthCoreConfig.plugins ?? [])],
  });

export type BetterAuth = ReturnType<typeof createAuth>;

export const betterAuthProvider: Provider = {
  provide: 'BetterAuth',
  useFactory: (
    prismaService: PrismaService,
    config: Config,
    emailOutbox: EmailOutbox,
  ) => createAuth(prismaService, config, emailOutbox),
  inject: [PrismaService, Config, EMAIL_OUTBOX],
};

export const InjectBetterAuth = Inject('BetterAuth');
