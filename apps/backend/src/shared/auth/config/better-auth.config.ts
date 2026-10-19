import { openAPI, username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
      // F-03.1. Required at sign-up by the registration hook, nullable in the
      // database for accounts created another way (seeded admin, later Google).
      // Never returned: they only feed aggregated statistics (F-06.7).
      gender: {
        type: 'string',
        required: false,
        input: true,
        returned: false,
      },
      birthDate: {
        type: 'date',
        required: false,
        input: true,
        returned: false,
      },
      // Set by the registration database hook, not by the client.
      termsAcceptedAt: {
        type: 'date',
        required: false,
        input: false,
        returned: false,
      },
      termsVersion: {
        type: 'string',
        required: false,
        input: false,
        returned: false,
      },
    },
  },
  // F-03.4: repeated failed sign-ins are cut off by the auth service itself.
  // Kept in the database so the count survives restarts and is shared
  // between instances; on in every environment, not only production.
  rateLimit: {
    enabled: true,
    storage: 'database',
    customRules: {
      '/sign-in/email': { window: 15 * 60, max: 5 },
    },
  },
  plugins: [openAPI(), username()],
};
