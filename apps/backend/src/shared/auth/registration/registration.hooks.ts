import {
  addOAuthServerContext,
  APIError,
  createAuthMiddleware,
  getOAuthState,
} from 'better-auth/api';
import { BetterAuthOptions } from 'better-auth/types';
import { googleAvatarAsDataUrl } from './google-avatar';
import {
  consentsAtSignUp,
  Gender,
  RegistrationErrorCode,
  validateRegistration,
} from './registration';

const SIGN_UP_PATH = '/sign-up/email';
const SOCIAL_SIGN_IN_PATH = '/sign-in/social';
const OAUTH_CALLBACK_PREFIX = '/callback/';

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

  // The app signs in with Google only through the redirect. With an `idToken`
  // BetterAuth would create the account right in this request, bypassing the
  // registration step and its stored nickname, gender, year and consents.
  if (ctx.path === SOCIAL_SIGN_IN_PATH && ctx.body?.idToken) {
    throw APIError.from('BAD_REQUEST', {
      code: 'ID_TOKEN_NOT_SUPPORTED',
      message: 'Sign in with Google through the redirect',
    });
  }

  // Sign-up with Google: the same F-03.1 rules, checked before the user leaves
  // for Google. Only the checked values travel on, as server-trusted context
  // (the request's own `additionalData` is client-controlled).
  if (ctx.path === SOCIAL_SIGN_IN_PATH && ctx.body?.requestSignUp === true) {
    const result = validateRegistration(
      ctx.body.additionalData ?? {},
      new Date(),
    );
    if (!result.ok) {
      throw APIError.from('BAD_REQUEST', {
        code: result.code,
        message: MESSAGES[result.code],
      });
    }
    // The username plugin only guards its own sign-up route, so a nickname
    // that is taken is refused here, before the user leaves for Google.
    const taken = await ctx.context.adapter.findOne({
      model: 'user',
      where: [{ field: 'username', value: result.username.toLowerCase() }],
    });
    if (taken) {
      throw APIError.from('BAD_REQUEST', {
        code: 'USERNAME_IS_ALREADY_TAKEN',
        message: 'Username is already taken. Please try another.',
      });
    }
    await addOAuthServerContext({
      registration: {
        username: result.username,
        gender: result.gender,
        birthYear: result.birthYear,
      },
    });
    return;
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
        if (ctx?.path === SIGN_UP_PATH) {
          return { data: { ...user, ...consentsAtSignUp(new Date()) } };
        }
        if (ctx?.path?.startsWith(OAUTH_CALLBACK_PREFIX)) {
          // Google is set to create accounts only on an explicit sign-up, which
          // validated and stored these in the sign-in step; nothing else may
          // get here.
          const state = await getOAuthState();
          const registration = state?.serverContext?.registration as
            { username: string; gender: Gender; birthYear: number } | undefined;
          if (!registration) {
            throw APIError.from('BAD_REQUEST', {
              code: 'REGISTRATION_REQUIRED',
              message: 'Sign up through the registration form first',
            });
          }
          const { username, gender, birthYear } = registration;
          // The nickname was free when the user left for Google; someone may
          // have taken it since. BetterAuth turns an API error with a code
          // into `?error=<code>` on the return address.
          const taken = await ctx.context.adapter.findOne({
            model: 'user',
            where: [{ field: 'username', value: username.toLowerCase() }],
          });
          if (taken) {
            throw APIError.from('BAD_REQUEST', {
              code: 'USERNAME_IS_ALREADY_TAKEN',
              message: 'Username is already taken. Please try another.',
            });
          }
          return {
            data: {
              ...user,
              // The app keeps only its own pictures in `user.image`: the
              // Google photo is stored as a WebP data URL, not as a link.
              image: await googleAvatarAsDataUrl(user.image),
              // #212: the nickname the user typed, not the Google name, is the
              // public name (ADR-0025); `username` is its lower-cased form.
              name: username,
              username: username.toLowerCase(),
              displayUsername: username,
              gender,
              birthYear,
              ...consentsAtSignUp(new Date()),
            },
          };
        }
      },
    },
  },
};
