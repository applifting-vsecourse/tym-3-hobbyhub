import { APIError, createAuthMiddleware } from 'better-auth/api';
import { BetterAuthOptions } from 'better-auth/types';
import {
  RegistrationErrorCode,
  TERMS_VERSION,
  validateRegistration,
} from './registration';

const SIGN_UP_PATH = '/sign-up/email';

const MESSAGES: Record<RegistrationErrorCode, string> = {
  INVALID_GENDER: 'Gender must be MALE or FEMALE',
  INVALID_BIRTH_DATE: 'Birth date must be a past date in the format YYYY-MM-DD',
  UNDERAGE: 'You must be at least 18 years old to register',
  TERMS_NOT_ACCEPTED: 'You must accept the terms to register',
};

/**
 * Validates the F-03.1 fields before BetterAuth creates the user, and turns
 * the birth date into a Date for the `date` column.
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
          birthDate: result.birthDate,
        },
      },
    };
  }

  // Gender and birth date feed the participant statistics (F-06.7); there is
  // no flow for changing them yet, so they are fixed after registration.
  if (
    ctx.path === '/update-user' &&
    ('gender' in (ctx.body ?? {}) || 'birthDate' in (ctx.body ?? {}))
  ) {
    throw APIError.from('BAD_REQUEST', {
      code: 'FIELD_NOT_ALLOWED',
      message: 'Gender and birth date cannot be changed',
    });
  }
});

/** Records which terms the user agreed to, at the moment the account is created. */
export const registrationDatabaseHooks: BetterAuthOptions['databaseHooks'] = {
  user: {
    create: {
      before: async (user, ctx) => {
        if (ctx?.path !== SIGN_UP_PATH) return;
        return {
          data: {
            ...user,
            termsAcceptedAt: new Date(),
            termsVersion: TERMS_VERSION,
          },
        };
      },
    },
  },
};
