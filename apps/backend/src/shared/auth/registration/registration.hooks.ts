import { APIError, createAuthMiddleware } from 'better-auth/api';
import { BetterAuthOptions } from 'better-auth/types';
import {
  consentsAtSignUp,
  RegistrationErrorCode,
  validateRegistration,
} from './registration';

const SIGN_UP_PATH = '/sign-up/email';

const MESSAGES: Record<RegistrationErrorCode, string> = {
  INVALID_GENDER: 'Gender must be MALE or FEMALE',
  INVALID_BIRTH_YEAR:
    'Birth year must be a whole number from 1900 to the current year',
  UNDERAGE: 'You must be at least 18 years old to register',
  TERMS_NOT_ACCEPTED: 'You must accept the terms to register',
  ADULTHOOD_NOT_CONFIRMED: 'You must confirm you are at least 18 to register',
};

/**
 * Validates the F-03.1 fields before BetterAuth creates the user and passes
 * on only the checked gender and year of birth.
 */
export const registrationBeforeHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path === SIGN_UP_PATH) {
    const result = validateRegistration(ctx.body ?? {}, new Date());
    if (!result.ok) {
      throw APIError.from('BAD_REQUEST', {
        code: result.code,
        message: MESSAGES[result.code],
      });
    }
    return {
      context: {
        body: {
          ...ctx.body,
          gender: result.gender,
          birthYear: result.birthYear,
        },
      },
    };
  }

  // Gender and year of birth feed the participant statistics (F-06.7). They
  // are corrected through the profile (PUT /api/profile/private), which runs
  // the same rules, never through BetterAuth's generic update.
  if (
    ctx.path === '/update-user' &&
    ('gender' in (ctx.body ?? {}) || 'birthYear' in (ctx.body ?? {}))
  ) {
    throw APIError.from('BAD_REQUEST', {
      code: 'FIELD_NOT_ALLOWED',
      message: 'Gender and birth year cannot be changed here',
    });
  }
});

/**
 * Records which terms the user agreed to and that they confirmed being 18+,
 * at the moment the account is created. The before hook has refused a
 * sign-up without either, so reaching this point means both were given.
 */
export const registrationDatabaseHooks: BetterAuthOptions['databaseHooks'] = {
  user: {
    create: {
      before: async (user, ctx) => {
        if (ctx?.path !== SIGN_UP_PATH) return;
        return { data: { ...user, ...consentsAtSignUp(new Date()) } };
      },
    },
  },
};
