import {
  googleUserRecord,
  openPendingGoogleUser,
  PENDING_TTL_MS,
  sealPendingGoogleUser,
} from './google-signup';

// better-auth ships ES modules, which Jest does not load: a reversible stand-in
// that, like the real one, only opens what the same key sealed.
jest.mock('better-auth/crypto', () => ({
  symmetricEncrypt: ({
    key,
    data,
  }: {
    key: string;
    data: string;
  }): Promise<string> =>
    Promise.resolve(Buffer.from(`${key}|${data}`).toString('base64url')),
  symmetricDecrypt: ({
    key,
    data,
  }: {
    key: string;
    data: string;
  }): Promise<string> => {
    const plain = Buffer.from(data, 'base64url').toString();
    if (!plain.startsWith(`${key}|`)) return Promise.reject(new Error('bad'));
    return Promise.resolve(plain.slice(key.length + 1));
  },
}));

const NOW = new Date('2026-11-21T10:00:00Z');
const google = {
  email: 'jana@example.com',
  name: 'Jana Nováková',
  image: 'https://lh3.googleusercontent.com/a/photo',
  emailVerified: true,
};

describe('the pending Google user', () => {
  it('is opened again by the server that sealed it', async () => {
    const token = await sealPendingGoogleUser('secret', google, NOW);

    expect(await openPendingGoogleUser('secret', token!, NOW)).toMatchObject({
      email: 'jana@example.com',
      name: 'Jana Nováková',
      image: 'https://lh3.googleusercontent.com/a/photo',
    });
  });

  it('is not sealed for an e-mail Google did not verify', async () => {
    expect(
      await sealPendingGoogleUser(
        'secret',
        { ...google, emailVerified: false },
        NOW,
      ),
    ).toBeNull();
    expect(
      await sealPendingGoogleUser('secret', { email: 'jana@example.com' }, NOW),
    ).toBeNull();
  });

  it('expires', async () => {
    const token = await sealPendingGoogleUser('secret', google, NOW);
    const later = new Date(NOW.getTime() + PENDING_TTL_MS + 1);

    expect(await openPendingGoogleUser('secret', token!, later)).toBeNull();
  });

  it('is refused when forged, made with another key, or empty', async () => {
    const token = await sealPendingGoogleUser('other-secret', google, NOW);

    expect(await openPendingGoogleUser('secret', token!, NOW)).toBeNull();
    expect(await openPendingGoogleUser('secret', 'garbage', NOW)).toBeNull();
    expect(await openPendingGoogleUser('secret', '', NOW)).toBeNull();
  });
});

describe('googleUserRecord', () => {
  it('names the account after the nickname, trusts the e-mail and records the consents', () => {
    const record = googleUserRecord(
      {
        email: 'jana@example.com',
        name: 'Jana Nováková',
        image: null,
        expiresAt: 0,
      },
      {
        username: 'Jana.N',
        gender: 'FEMALE',
        birthYear: 1990,
        preferredLanguage: 'EN',
      },
      'data:image/webp;base64,AAAA',
      NOW,
    );

    expect(record).toMatchObject({
      email: 'jana@example.com',
      emailVerified: true,
      // Not the Google name: the nickname is the public name (ADR-0025).
      name: 'Jana.N',
      username: 'jana.n',
      displayUsername: 'Jana.N',
      gender: 'FEMALE',
      birthYear: 1990,
      preferredLanguage: 'EN',
      image: 'data:image/webp;base64,AAAA',
      termsAcceptedAt: NOW,
      adulthoodConfirmedAt: NOW,
    });
  });
});
