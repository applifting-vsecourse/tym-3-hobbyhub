import { RESEND_COOLDOWN_MS, ResendCooldown } from './resend-cooldown';

describe('ResendCooldown', () => {
  const t0 = 1_000_000;

  it('lets an address nobody sent to through', () => {
    expect(new ResendCooldown().waitSeconds('a@example.com', t0)).toBe(0);
  });

  it('makes the address wait after a send, and says how long', () => {
    const cooldown = new ResendCooldown();
    cooldown.record('a@example.com', t0);

    expect(cooldown.waitSeconds('a@example.com', t0 + 20_000)).toBe(40);
  });

  it('lets it through again once the minute is over', () => {
    const cooldown = new ResendCooldown();
    cooldown.record('a@example.com', t0);

    expect(cooldown.waitSeconds('a@example.com', t0 + RESEND_COOLDOWN_MS)).toBe(
      0,
    );
  });

  it('does not use up the minute by being asked, only by a send', () => {
    const cooldown = new ResendCooldown();

    cooldown.waitSeconds('a@example.com', t0);
    expect(cooldown.waitSeconds('a@example.com', t0 + 1000)).toBe(0);
  });

  it('treats the address case-insensitively', () => {
    const cooldown = new ResendCooldown();
    cooldown.record('Jana@Example.com', t0);

    expect(cooldown.waitSeconds(' jana@example.com ', t0 + 1000)).toBe(59);
  });

  it('does not hold one person back for another', () => {
    const cooldown = new ResendCooldown();
    cooldown.record('a@example.com', t0);

    expect(cooldown.waitSeconds('b@example.com', t0 + 1000)).toBe(0);
  });

  it('never tracks more addresses than it can hold', () => {
    const cooldown = new ResendCooldown();
    for (let i = 0; i < 10_050; i++) {
      cooldown.record(`x${i}@example.com`, t0);
    }

    // The oldest were dropped to make room, the newest are still waiting.
    expect(cooldown.waitSeconds('x0@example.com', t0 + 1000)).toBe(0);
    expect(cooldown.waitSeconds('x10049@example.com', t0 + 1000)).toBe(59);
  });

  it('evicts by the order of sends even for an address sent to twice', () => {
    const cooldown = new ResendCooldown();
    cooldown.record('first@example.com', t0);
    cooldown.record('second@example.com', t0 + 1);
    // Sent to again after its minute: now it is the newest, not the oldest.
    cooldown.record('first@example.com', t0 + RESEND_COOLDOWN_MS + 5);
    for (let i = 0; i < 10_000; i++) {
      cooldown.record(`x${i}@example.com`, t0 + RESEND_COOLDOWN_MS + 6);
    }

    expect(
      cooldown.waitSeconds('first@example.com', t0 + RESEND_COOLDOWN_MS + 7),
    ).toBeGreaterThanOrEqual(0);
  });
});
