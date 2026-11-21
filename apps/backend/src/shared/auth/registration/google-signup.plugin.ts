import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { googleAvatarAsDataUrl } from './google-avatar';
import { googleUserRecord, openPendingGoogleUser } from './google-signup';
import { validateRegistration } from './registration';
import { REGISTRATION_MESSAGES } from './registration.hooks';

const PATH = '/google-signup';

/**
 * Finishing a sign-up that began with Google. The first round trip to Google
 * proved the e-mail but made no account (the registration fields were missing);
 * the sign-up page then asks for them and ends here, so the visitor does not
 * go to Google a second time. The only proof of the Google identity is the
 * encrypted, short-lived token the callback issued.
 */
export const googleSignUp = (): BetterAuthPlugin => ({
  id: 'google-signup',
  endpoints: {
    // Whose Google account is it? So the page can greet it.
    googleSignUpPending: createAuthEndpoint(
      `${PATH}/pending`,
      { method: 'GET' },
      async (ctx) => {
        const token = String((ctx.query as { token?: unknown })?.token ?? '');
        const pending = await openPendingGoogleUser(
          ctx.context.secret,
          token,
          new Date(),
        );
        if (!pending) {
          throw APIError.from('BAD_REQUEST', {
            code: 'GOOGLE_SIGNUP_EXPIRED',
            message: 'The Google sign-up has expired; start again',
          });
        }
        return ctx.json({ email: pending.email });
      },
    ),
    googleSignUpComplete: createAuthEndpoint(
      `${PATH}/complete`,
      { method: 'POST' },
      async (ctx) => {
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        const now = new Date();
        const pending = await openPendingGoogleUser(
          ctx.context.secret,
          String(body.token ?? ''),
          now,
        );
        if (!pending) {
          throw APIError.from('BAD_REQUEST', {
            code: 'GOOGLE_SIGNUP_EXPIRED',
            message: 'The Google sign-up has expired; start again',
          });
        }

        // The same F-03.1 rules as every other sign-up.
        const result = validateRegistration(body, now);
        if (!result.ok) {
          throw APIError.from('BAD_REQUEST', {
            code: result.code,
            message: REGISTRATION_MESSAGES[result.code],
          });
        }

        const adapter = ctx.context.internalAdapter;
        if (await adapter.findUserByEmail(pending.email)) {
          throw APIError.from('BAD_REQUEST', {
            code: 'USER_ALREADY_EXISTS',
            message: 'An account with this e-mail already exists',
          });
        }
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

        const user = await adapter.createUser(
          googleUserRecord(
            pending,
            result,
            await googleAvatarAsDataUrl(pending.image),
            now,
          ) as never,
          { method: 'google-signup' },
        );
        const session = await adapter.createSession(user.id);
        await setSessionCookie(ctx, { session, user });
        return ctx.json({ ok: true });
      },
    ),
  },
  rateLimit: [
    {
      pathMatcher: (path: string) => path.startsWith(`${PATH}/`),
      window: 60,
      max: 10,
    },
  ],
});
