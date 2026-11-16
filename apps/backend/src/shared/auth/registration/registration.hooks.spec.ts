import { getOAuthState } from 'better-auth/api';
import { registrationDatabaseHooks } from './registration.hooks';

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
const user = { name: 'Jana', email: 'jana@example.com' } as never;

describe('registrationDatabaseHooks (Google sign-up)', () => {
  beforeEach(() => jest.mocked(getOAuthState).mockReset());

  it('creates the account with the checked gender, year and consents', async () => {
    jest.mocked(getOAuthState).mockResolvedValue({
      serverContext: {
        registration: { username: 'Jana.N', gender: 'FEMALE', birthYear: 1990 },
      },
    } as never);

    const result = (await createBefore(user, {
      path: '/callback/google',
    } as never)) as { data: Record<string, unknown> };

    expect(result.data).toMatchObject({
      name: 'Jana.N',
      username: 'jana.n',
      displayUsername: 'Jana.N',
      gender: 'FEMALE',
      birthYear: 1990,
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

  it('leaves other paths alone', async () => {
    await expect(
      createBefore(user, { path: '/other' } as never),
    ).resolves.toBeUndefined();
  });
});
