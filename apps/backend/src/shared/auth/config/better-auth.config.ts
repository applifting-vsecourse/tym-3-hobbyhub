import { openAPI, username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
    // Checked by the server whatever the form says; the same limit as the
    // frontend's sign-up schema. Answers with PASSWORD_TOO_SHORT.
    minPasswordLength: 8,
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
      // #174: the year only, never the full date (ADR-0016).
      birthYear: {
        type: 'number',
        required: false,
        input: true,
        returned: false,
      },
      // Set by the registration database hook, not by the client.
      adulthoodConfirmedAt: {
        type: 'date',
        required: false,
        input: false,
        returned: false,
      },
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
      // F-03.2: the once-a-minute wait is kept per address around the send
      // itself (verification/send-once-a-minute.ts); this is only the coarse
      // cap on top, per IP (or one shared bucket where no IP is known),
      // against mail bombing.
      '/send-verification-email': { window: 60, max: 30 },
    },
  },
  plugins: [openAPI(), username()],
};
