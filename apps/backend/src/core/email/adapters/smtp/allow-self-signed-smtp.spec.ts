import { allowSelfSignedSmtp } from './allow-self-signed-smtp';

describe('allowSelfSignedSmtp', () => {
  it('checks the certificate unless asked not to', () => {
    expect(allowSelfSignedSmtp(false, 'production')).toBe(false);
    expect(allowSelfSignedSmtp(false, 'development')).toBe(false);
  });

  it('accepts a self-signed certificate in development (Mailpit)', () => {
    expect(allowSelfSignedSmtp(true, 'development')).toBe(true);
  });

  it.each(['production', 'test', undefined])(
    'refuses to start with it under NODE_ENV=%s',
    (nodeEnv) => {
      expect(() => allowSelfSignedSmtp(true, nodeEnv)).toThrow(
        /SMTP_ALLOW_SELF_SIGNED/,
      );
    },
  );
});
