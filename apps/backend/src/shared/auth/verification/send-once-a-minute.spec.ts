import { ResendCooldown } from './resend-cooldown';
import { sendOnceAMinute } from './send-once-a-minute';

describe('sendOnceAMinute', () => {
  const email = 'jana@example.com';

  it('sends the first e-mail', async () => {
    const send = jest.fn().mockResolvedValue(undefined);

    await sendOnceAMinute(new ResendCooldown(), email, send);

    expect(send).toHaveBeenCalledTimes(1);
  });

  // The registration's e-mail counts: "send again" right after it waits.
  it('skips a second one within the minute, without an error', async () => {
    const cooldown = new ResendCooldown();
    const send = jest.fn().mockResolvedValue(undefined);

    await sendOnceAMinute(cooldown, email, send);
    await expect(
      sendOnceAMinute(cooldown, email, send),
    ).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sends only once for two requests at the same moment', async () => {
    const cooldown = new ResendCooldown();
    const send = jest.fn().mockResolvedValue(undefined);

    await Promise.all([
      sendOnceAMinute(cooldown, email, send),
      sendOnceAMinute(cooldown, email, send),
    ]);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('gives the minute back when the send fails, and rethrows', async () => {
    const cooldown = new ResendCooldown();
    const failing = jest.fn().mockRejectedValue(new Error('SMTP down'));
    const working = jest.fn().mockResolvedValue(undefined);

    await expect(sendOnceAMinute(cooldown, email, failing)).rejects.toThrow(
      'SMTP down',
    );
    await sendOnceAMinute(cooldown, email, working);

    expect(working).toHaveBeenCalledTimes(1);
  });
});
