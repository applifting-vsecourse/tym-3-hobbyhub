import {
  EMAIL_OUTBOX,
  EmailOutbox,
} from '@/core/email/outbox/email-outbox.interface';
import { PrismaService } from '@/core/prisma/prisma.service';
import { ADMIN_PASSWORD_MIN_LENGTH } from '@/shared/admin-auth/domain/administrator';
import {
  ADMIN_RESET_PASSWORD_TTL_SECONDS,
  adminSetPasswordUrl,
  enqueueAdminPasswordEmail,
} from '@/shared/admin-auth/password-links';
import { Config } from '@/shared/config/config.service';
import { Inject, Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';

export const ADMIN_AUTH_BASE_PATH = '/api/admin-auth';

// ADR-0010, #238: the administrator's sign-in, a second BetterAuth instance on
// its own tables, cookie and path. Nothing here touches `User`: an admin
// session never opens the users' endpoints, a user session never opens the
// administration. MFA (#70) is the `twoFactor` plugin on this instance.
//
// `emailOutbox` is missing only where nothing is e-mailed (`admin:create`).
export const createAdminAuth = (
  prismaService: PrismaService,
  config: Config,
  emailOutbox?: EmailOutbox,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
  // ADR-0021: a deactivated administrator neither signs in nor gets a link.
  const isDeactivated = async (administratorId: string): Promise<boolean> => {
    const administrator = await prismaService.administrator.findUnique({
      where: { id: administratorId },
      select: { deactivatedAt: true },
    });
    return !administrator || administrator.deactivatedAt !== null;
  };

  return betterAuth({
    appName: 'HobbyHub Administrace',
    baseURL: config.backendUrl,
    basePath: ADMIN_AUTH_BASE_PATH,
    database: prismaAdapter(prismaService, { provider: 'postgresql' }),
    // Prisma client delegates, see `schema.prisma`.
    user: { modelName: 'administrator' },
    session: { modelName: 'adminSession' },
    account: { modelName: 'adminAccount' },
    verification: { modelName: 'adminVerification' },
    trustedOrigins: [config.frontendUrl],
    emailAndPassword: {
      enabled: true,
      // Administrators come from the seed and `admin:create`, never sign up.
      disableSignUp: true,
      minPasswordLength: ADMIN_PASSWORD_MIN_LENGTH,
      // ADR-0021, "Zapomenuté heslo": an hour, like the users' link. The
      // invitation issues the same token for 72 hours itself.
      resetPasswordTokenExpiresIn: ADMIN_RESET_PASSWORD_TTL_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        // Answers the same either way, so nobody learns whether the address
        // belongs to an administrator, or to a deactivated one.
        if (await isDeactivated(user.id)) return;
        if (!emailOutbox) throw new Error('No e-mail outbox to send through');
        await enqueueAdminPasswordEmail(
          emailOutbox,
          'reset',
          user,
          adminSetPasswordUrl(config, token),
        );
      },
    },
    databaseHooks: {
      session: {
        create: {
          // The same answer as a wrong password: the sign-in form tells
          // nobody that the account exists but was taken away.
          before: async (session) => {
            if (await isDeactivated(session.userId)) {
              throw APIError.from('UNAUTHORIZED', {
                code: 'INVALID_EMAIL_OR_PASSWORD',
                message: 'Invalid email or password',
              });
            }
          },
        },
      },
    },
    advanced: {
      cookiePrefix: 'hobbyhub-admin',
    },
    // The users' F-03.4 limit, in a table of its own: the limiter keys on IP
    // and path, and the paths are the same as the users'.
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'adminRateLimit',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 15 * 60, max: 5 },
        // Like the users' F-03.5 caps.
        '/request-password-reset': { window: 60, max: 30 },
        '/reset-password': { window: 15 * 60, max: 10 },
      },
    },
  });
};

export type AdminAuth = ReturnType<typeof createAdminAuth>;

export const ADMIN_AUTH = 'AdminAuth';

export const adminAuthProvider: Provider = {
  provide: ADMIN_AUTH,
  useFactory: (
    prismaService: PrismaService,
    config: Config,
    emailOutbox?: EmailOutbox,
  ) => createAdminAuth(prismaService, config, emailOutbox),
  // The app's global MailModule or the seed's immediate outbox provides it.
  inject: [PrismaService, Config, { token: EMAIL_OUTBOX, optional: true }],
};

export const InjectAdminAuth = Inject(ADMIN_AUTH);
