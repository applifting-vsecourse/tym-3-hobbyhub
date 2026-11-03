import { RESEND_COOLDOWN_MS, ResendCooldown } from './resend-cooldown';

describe('ResendCooldown', () => {
  const t0 = 1_000_000;

  it('lets an address nobody sent to through', () => {
    expect(new ResendCooldown().reserve('a@example.com', t0)).toBe(0);
  });

  it('makes the address wait after a send, and says how long', () => {
    const cooldown = new ResendCooldown();
    cooldown.reserve('a@example.com', t0);

    expect(cooldown.reserve('a@example.com', t0 + 20_000)).toBe(40);
  });

  // Two requests at the same moment: only the first gets the send.
  it('reserves the send, so a second request at once has to wait', () => {
    const cooldown = new ResendCooldown();

    expect(cooldown.reserve('a@example.com', t0)).toBe(0);
    expect(cooldown.reserve('a@example.com', t0)).toBe(60);
  });

  it('does not extend the wait by being asked again', () => {
    const cooldown = new ResendCooldown();
    cooldown.reserve('a@example.com', t0);
    cooldown.reserve('a@example.com', t0 + 30_000);

    expect(cooldown.reserve('a@example.com', t0 + RESEND_COOLDOWN_MS)).toBe(0);
  });

  it('gives the minute back when the send failed', () => {
    const cooldown = new ResendCooldown();
    cooldown.reserve('a@example.com', t0);
    cooldown.release('a@example.com');

    expect(cooldown.reserve('a@example.com', t0 + 1000)).toBe(0);
  });

  it('treats the address case-insensitively', () => {
    const cooldown = new ResendCooldown();
    cooldown.reserve('Jana@Example.com', t0);

    expect(cooldown.reserve(' jana@example.com ', t0 + 1000)).toBe(59);
    cooldown.release('JANA@example.com');
    expect(cooldown.reserve('jana@example.com', t0 + 2000)).toBe(0);
  });

  it('does not hold one person back for another', () => {
    const cooldown = new ResendCooldown();
    cooldown.reserve('a@example.com', t0);

    expect(cooldown.reserve('b@example.com', t0 + 1000)).toBe(0);
  });

  it('never tracks more addresses than it can hold', () => {
    const cooldown = new ResendCooldown();
    for (let i = 0; i < 10_050; i++) {
      cooldown.reserve(`x${i}@example.com`, t0);
    }

    // The oldest were dropped to make room, the newest are still waiting.
    expect(cooldown.reserve('x0@example.com', t0 + 1000)).toBe(0);
    expect(cooldown.reserve('x10049@example.com', t0 + 1000)).toBe(59);
  });

  it('evicts by the order of sends even for an address sent to twice', () => {
    const cooldown = new ResendCooldown();
    cooldown.reserve('first@example.com', t0);
    cooldown.reserve('second@example.com', t0 + 1);
    // Sent to again after its minute: now it is the newest, not the oldest.
    cooldown.reserve('first@example.com', t0 + RESEND_COOLDOWN_MS + 5);
    for (let i = 0; i < 9_990; i++) {
      cooldown.reserve(`x${i}@example.com`, t0 + RESEND_COOLDOWN_MS + 6);
    }
    cooldown.reserve('last@example.com', t0 + RESEND_COOLDOWN_MS + 7);

    expect(
      cooldown.reserve('first@example.com', t0 + RESEND_COOLDOWN_MS + 8),
    ).toBeGreaterThan(0);
  });
});
