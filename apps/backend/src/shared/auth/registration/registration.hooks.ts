import { APIError, createAuthMiddleware } from 'better-auth/api';
import { BetterAuthOptions } from 'better-auth/types';
import {
  consentsAtSignUp,
  RegistrationErrorCode,
  validateRegistration,
} from './registration';

const SIGN_UP_PATH = '/sign-up/email';

// The nickname is changed only through the profile (PATCH /api/profile),
// which keeps the three columns together and waits 30 days between changes.
// #262: the language too, through PUT /api/profile/language.
const PROFILE_ONLY_FIELDS = [
  'name',
  'username',
  'displayUsername',
  'gender',
  'birthYear',
  'preferredLanguage',
];

const MESSAGES: Record<RegistrationErrorCode, string> = {
  NICKNAME_TOO_SHORT: 'The nickname must be at least 3 characters long',
  NICKNAME_TOO_LONG: 'The nickname must be at most 30 characters long',
  NICKNAME_INVALID:
    'The nickname may contain only letters a-z, digits, "_" and "."',
  NICKNAME_RESERVED: 'The nickname contains a reserved word',
  INVALID_GENDER: 'Gender must be MALE or FEMALE',
  INVALID_BIRTH_YEAR:
    'Birth year must be a whole number from 1900 to the current year',
  UNDERAGE: 'You must be at least 18 years old to register',
  TERMS_NOT_ACCEPTED: 'You must accept the terms to register',
  ADULTHOOD_NOT_CONFIRMED: 'You must confirm you are at least 18 to register',
  INVALID_LANGUAGE: 'The language must be CS or EN',
};

/**
 * Validates the F-03.1 fields and the nickname before BetterAuth creates the
 * user and passes on only the checked values. The username plugin then
 * refuses a nickname someone has already (USERNAME_IS_ALREADY_TAKEN).
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
          // #212: `name` is a copy of the nickname as typed; whatever the
          // client sent as the name is ignored (ADR-0025).
          name: result.username,
          username: result.username,
          displayUsername: result.username,
          gender: result.gender,
          birthYear: result.birthYear,
          preferredLanguage: result.preferredLanguage,
        },
      },
    };
  }

  // #212: the nickname is public, so it is no sign-in credential: only the
  // e-mail signs in.
  if (ctx.path === '/sign-in/username') {
    throw APIError.from('NOT_FOUND', {
      code: 'NOT_FOUND',
      message: 'Sign in with your e-mail',
    });
  }

  // Gender and year of birth feed the participant statistics (F-06.7); they
  // and the nickname are changed through the profile, which runs the same
  // rules, never through BetterAuth's generic update.
  if (
    ctx.path === '/update-user' &&
    PROFILE_ONLY_FIELDS.some((field) => field in (ctx.body ?? {}))
  ) {
    throw APIError.from('BAD_REQUEST', {
      code: 'FIELD_NOT_ALLOWED',
      message:
        'The nickname, gender, birth year and language cannot be changed here',
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
