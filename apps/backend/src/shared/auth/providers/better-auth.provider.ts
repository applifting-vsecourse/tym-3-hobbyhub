import { EmailService } from '@/core/email/interfaces/email-service.interface';
import { renderEmail } from '@/core/email/render';
import { ResetPassword } from '@/core/email/templates/reset-password';
import { VerifyEmail } from '@/core/email/templates/verify-email';
import { PrismaService } from '@/core/prisma/prisma.service';
import { betterAuthCoreConfig } from '@/shared/auth/config/better-auth.config';
import {
  registrationBeforeHook,
  registrationDatabaseHooks,
} from '@/shared/auth/registration/registration.hooks';
import { Config } from '@/shared/config/config.service';
import { Inject, Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const createAuth = (
  prismaService: PrismaService,
  config: Config,
  emailProvider: EmailService,
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
        await emailProvider.sendEmail(user.email, 'Password reset', html);
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
        const html = await renderEmail(VerifyEmail, { url });
        await emailProvider.sendEmail(
          user.email,
          'Verify your email address',
          html,
        );
      },
      sendOnSignUp: true,
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
    emailProvider: EmailService,
  ) => createAuth(prismaService, config, emailProvider),
  inject: [PrismaService, Config, 'EmailService'],
};

export const InjectBetterAuth = Inject('BetterAuth');
