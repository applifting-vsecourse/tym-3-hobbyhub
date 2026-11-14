/**
 * Whether the SMTP adapter may accept a self-signed certificate: the local
 * Mailpit inbox has one. Only in development; anywhere else the flag is a
 * mistake that would let a forged server read the password and the e-mails,
 * so the backend refuses to start rather than quietly ignore it.
 */
export const allowSelfSignedSmtp = (
  requested: boolean,
  nodeEnv: string | undefined,
): boolean => {
  if (!requested) return false;
  if (nodeEnv !== 'development') {
    throw new Error(
      `SMTP_ALLOW_SELF_SIGNED is for local development only (NODE_ENV=development), not NODE_ENV=${nodeEnv ?? '(unset)'}. Remove it.`,
    );
  }
  return true;
};
