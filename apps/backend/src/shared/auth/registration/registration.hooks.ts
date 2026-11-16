import {
  addOAuthServerContext,
  APIError,
  createAuthMiddleware,
  getOAuthState,
} from 'better-auth/api';
import { BetterAuthOptions } from 'better-auth/types';
import {
  consentsAtSignUp,
  Gender,
  RegistrationErrorCode,
  validateRegistration,
} from './registration';

const SIGN_UP_PATH = '/sign-up/email';
const SOCIAL_SIGN_IN_PATH = '/sign-in/social';
const OAUTH_CALLBACK_PREFIX = '/callback/';

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

  // Sign-up with Google: the same F-03.1 rules, checked before the user leaves
  // for Google. Only the checked values travel on, as server-trusted context
  // (the request's own `additionalData` is client-controlled).
  if (ctx.path === SOCIAL_SIGN_IN_PATH && ctx.body?.requestSignUp === true) {
    const result = validateRegistration(ctx.body.additionalData ?? {}, new Date());
    if (!result.ok) {
      throw APIError.from('BAD_REQUEST', {
        code: result.code,
        message: MESSAGES[result.code],
      });
    }
    await addOAuthServerContext({
      registration: { gender: result.gender, birthYear: result.birthYear },
    });
    return;
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
        if (ctx?.path === SIGN_UP_PATH) {
          return { data: { ...user, ...consentsAtSignUp(new Date()) } };
        }
        if (ctx?.path?.startsWith(OAUTH_CALLBACK_PREFIX)) {
          // Google is set to create accounts only on an explicit sign-up, which
          // validated and stored these in the sign-in step; nothing else may
          // get here.
          const state = await getOAuthState();
          const registration = state?.serverContext?.registration as
            | { gender: Gender; birthYear: number }
            | undefined;
          if (!registration) {
            throw APIError.from('BAD_REQUEST', {
              code: 'REGISTRATION_REQUIRED',
              message: 'Sign up through the registration form first',
            });
          }
          return {
            data: { ...user, ...registration, ...consentsAtSignUp(new Date()) },
          };
        }
      },
    },
  },
};
