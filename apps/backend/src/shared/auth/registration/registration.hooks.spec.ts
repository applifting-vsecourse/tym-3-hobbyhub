import { addOAuthServerContext, getOAuthState } from 'better-auth/api';
import { googleAvatarAsDataUrl } from './google-avatar';
import {
  registrationBeforeHook,
  registrationDatabaseHooks,
} from './registration.hooks';

jest.mock('./google-avatar', () => ({ googleAvatarAsDataUrl: jest.fn() }));

// better-auth ships ES modules, which Jest does not load: stand in for the few
// pieces the hooks use.
jest.mock('better-auth/api', () => ({
  APIError: {
    from: (_status: string, body: unknown): Error =>
      Object.assign(new Error(), { body }),
  },
  createAuthMiddleware: (handler: unknown): unknown => handler,
  addOAuthServerContext: jest.fn(),
  getOAuthState: jest.fn(),
}));

const createBefore = registrationDatabaseHooks!.user!.create!.before!;
const user = {
  name: 'Jana Nováková',
  email: 'jana@example.com',
  image: 'https://lh3.googleusercontent.com/a/photo',
} as never;
const adapter = (
  taken: boolean,
): { context: { adapter: { findOne: jest.Mock } } } => ({
  context: {
    adapter: {
      findOne: jest.fn().mockResolvedValue(taken ? { id: 'u1' } : null),
    },
  },
});

describe('registrationDatabaseHooks (Google sign-up)', () => {
  beforeEach(() => {
    jest.mocked(getOAuthState).mockReset();
    jest.mocked(googleAvatarAsDataUrl).mockReset();
  });

  it('creates the account with the checked gender, year and consents', async () => {
    jest.mocked(getOAuthState).mockResolvedValue({
      serverContext: {
        registration: { username: 'Jana.N', gender: 'FEMALE', birthYear: 1990 },
      },
    } as never);

    jest
      .mocked(googleAvatarAsDataUrl)
      .mockResolvedValue('data:image/webp;base64,AAAA');

    const result = (await createBefore(user, {
      path: '/callback/google',
      ...adapter(false),
    } as never)) as { data: Record<string, unknown> };

    expect(result.data).toMatchObject({
      name: 'Jana.N',
      username: 'jana.n',
      displayUsername: 'Jana.N',
      gender: 'FEMALE',
      birthYear: 1990,
      image: 'data:image/webp;base64,AAAA',
      termsVersion: expect.any(String) as string,
    });
    expect(result.data.termsAcceptedAt).toBeInstanceOf(Date);
    expect(result.data.adulthoodConfirmedAt).toBeInstanceOf(Date);
  });

  it('refuses an account created without going through the sign-up form', async () => {
    jest.mocked(getOAuthState).mockResolvedValue({} as never);

    await expect(
      createBefore(user, { path: '/callback/google' } as never),
    ).rejects.toMatchObject({
      body: { code: 'REGISTRATION_REQUIRED' },
    });
  });

  it('refuses a nickname taken while the user was at Google', async () => {
    jest.mocked(getOAuthState).mockResolvedValue({
      serverContext: {
        registration: { username: 'Jana.N', gender: 'FEMALE', birthYear: 1990 },
      },
    } as never);

    await expect(
      createBefore(user, {
        path: '/callback/google',
        ...adapter(true),
      } as never),
    ).rejects.toMatchObject({ body: { code: 'USERNAME_IS_ALREADY_TAKEN' } });
  });

  it('leaves other paths alone', async () => {
    await expect(
      createBefore(user, { path: '/other' } as never),
    ).resolves.toBeUndefined();
  });
});

describe('registrationBeforeHook (sign-in with Google)', () => {
  const run = registrationBeforeHook as unknown as (
    ctx: unknown,
  ) => Promise<unknown>;
  const additionalData = {
    username: 'Jana.N',
    gender: 'FEMALE',
    birthYear: 1990,
    termsAccepted: true,
    adulthoodConfirmed: true,
  };

  beforeEach(() => jest.mocked(addOAuthServerContext).mockReset());

  it('refuses a sign-in with an ID token, which would skip the registration', async () => {
    await expect(
      run({
        path: '/sign-in/social',
        body: {
          provider: 'google',
          idToken: { token: 'x' },
          requestSignUp: true,
          additionalData,
        },
        ...adapter(false),
      }),
    ).rejects.toMatchObject({ body: { code: 'ID_TOKEN_NOT_SUPPORTED' } });
  });

  it('refuses invalid registration data before leaving for Google', async () => {
    await expect(
      run({
        path: '/sign-in/social',
        body: { provider: 'google', requestSignUp: true, additionalData: {} },
        ...adapter(false),
      }),
    ).rejects.toMatchObject({
      body: expect.objectContaining({ code: expect.any(String) }),
    });
  });

  it('refuses a nickname that is already taken', async () => {
    await expect(
      run({
        path: '/sign-in/social',
        body: { provider: 'google', requestSignUp: true, additionalData },
        ...adapter(true),
      }),
    ).rejects.toMatchObject({ body: { code: 'USERNAME_IS_ALREADY_TAKEN' } });
    expect(addOAuthServerContext).not.toHaveBeenCalled();
  });

  it('passes only the checked values on as server context', async () => {
    await run({
      path: '/sign-in/social',
      body: { provider: 'google', requestSignUp: true, additionalData },
      ...adapter(false),
    });
    expect(addOAuthServerContext).toHaveBeenCalledWith({
      registration: { username: 'Jana.N', gender: 'FEMALE', birthYear: 1990 },
    });
  });
});
