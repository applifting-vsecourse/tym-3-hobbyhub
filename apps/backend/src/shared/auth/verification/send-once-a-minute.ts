import { ResendCooldown } from './resend-cooldown';

/**
 * F-03.2: runs `send` unless this address was sent to less than a minute ago,
 * the registration's first e-mail included. The skipped send answers like a
 * made one, so the endpoint tells nobody whether an address has an account
 * that was just written to. A failed send gives the minute back and rethrows.
 */
export async function sendOnceAMinute(
  cooldown: ResendCooldown,
  email: string,
  send: () => Promise<void>,
): Promise<void> {
  const token = cooldown.reserve(email);
  if (token === null) return;
  try {
    await send();
  } catch (error) {
    cooldown.release(email, token);
    throw error;
  }
}
