import { RESEND_COOLDOWN_MS, ResendCooldown } from './resend-cooldown';

describe('ResendCooldown', () => {
  const t0 = 1_000_000;

  it('lets the first send through', () => {
    expect(new ResendCooldown().take('a@example.com', t0)).toBe(0);
  });

  it('makes the same address wait, and says how long', () => {
    const cooldown = new ResendCooldown();
    cooldown.take('a@example.com', t0);

    expect(cooldown.take('a@example.com', t0 + 20_000)).toBe(40);
  });

  it('does not extend the wait by being asked again', () => {
    const cooldown = new ResendCooldown();
    cooldown.take('a@example.com', t0);
    cooldown.take('a@example.com', t0 + 30_000);

    expect(cooldown.take('a@example.com', t0 + RESEND_COOLDOWN_MS)).toBe(0);
  });

  it('treats the address case-insensitively', () => {
    const cooldown = new ResendCooldown();
    cooldown.take('Jana@Example.com', t0);

    expect(cooldown.take(' jana@example.com ', t0 + 1000)).toBe(59);
  });

  it('does not hold one person back for another', () => {
    const cooldown = new ResendCooldown();
    cooldown.take('a@example.com', t0);

    expect(cooldown.take('b@example.com', t0 + 1000)).toBe(0);
  });

  it('never tracks more addresses than it can hold', () => {
    const cooldown = new ResendCooldown();
    for (let i = 0; i < 10_050; i++) cooldown.take(`x${i}@example.com`, t0);

    // The oldest were dropped to make room, so the first may be sent again.
    expect(cooldown.take('x0@example.com', t0 + 1000)).toBe(0);
    expect(cooldown.take('x10049@example.com', t0 + 1000)).toBe(59);
  });
});
