import { PrismaService } from '@/core/prisma/prisma.service';
import { ADMIN_PASSWORD_MIN_LENGTH } from '@/shared/admin-auth/domain/administrator';
import { Config } from '@/shared/config/config.service';
import { Inject, Provider } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

export const ADMIN_AUTH_BASE_PATH = '/api/admin-auth';

// ADR-0010, #238: the administrator's sign-in, a second BetterAuth instance on
// its own tables, cookie and path. Nothing here touches `User`: an admin
// session never opens the users' endpoints, a user session never opens the
// administration. MFA (#70) is the `twoFactor` plugin on this instance.
export const createAdminAuth = (
  prismaService: PrismaService,
  config: Config,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
  betterAuth({
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
      },
    },
  });

export type AdminAuth = ReturnType<typeof createAdminAuth>;

export const ADMIN_AUTH = 'AdminAuth';

export const adminAuthProvider: Provider = {
  provide: ADMIN_AUTH,
  useFactory: (prismaService: PrismaService, config: Config) =>
    createAdminAuth(prismaService, config),
  inject: [PrismaService, Config],
};

export const InjectAdminAuth = Inject(ADMIN_AUTH);
