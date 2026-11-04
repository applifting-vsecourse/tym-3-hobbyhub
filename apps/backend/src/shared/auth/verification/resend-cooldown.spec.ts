import { RESEND_COOLDOWN_MS, ResendCooldown } from './resend-cooldown';

describe('ResendCooldown', () => {
  const t0 = 1_000_000;

  it('lets an address nobody sent to through', () => {
    expect(new ResendCooldown().reserve('a@example.com', t0)).not.toBeNull();
  });

  it('refuses the same address within the minute', () => {
    const cooldown = new ResendCooldown();
    cooldown.reserve('a@example.com', t0);

    expect(cooldown.reserve('a@example.com', t0 + 20_000)).toBeNull();
  });

  it('reserves the send, so a second request at once is refused', () => {
    const cooldown = new ResendCooldown();

    expect(cooldown.reserve('a@example.com', t0)).not.toBeNull();
    expect(cooldown.reserve('a@example.com', t0)).toBeNull();
  });

  it('lets it through again once the minute is over', () => {
    const cooldown = new ResendCooldown();
    cooldown.reserve('a@example.com', t0);

    expect(
      cooldown.reserve('a@example.com', t0 + RESEND_COOLDOWN_MS),
    ).not.toBeNull();
  });

  it('gives the minute back when the send failed', () => {
    const cooldown = new ResendCooldown();
    const token = cooldown.reserve('a@example.com', t0) as number;
    cooldown.release('a@example.com', token);

    expect(cooldown.reserve('a@example.com', t0 + 1000)).not.toBeNull();
  });

  // Request A fails late, after request B got a new reservation.
  it('does not let an old request release a newer reservation', () => {
    const cooldown = new ResendCooldown();
    const old = cooldown.reserve('a@example.com', t0) as number;
    cooldown.reserve('a@example.com', t0 + RESEND_COOLDOWN_MS + 1);

    cooldown.release('a@example.com', old);

    expect(
      cooldown.reserve('a@example.com', t0 + RESEND_COOLDOWN_MS + 2),
    ).toBeNull();
  });

  it('treats the address case-insensitively', () => {
    const cooldown = new ResendCooldown();
    const token = cooldown.reserve('Jana@Example.com', t0) as number;

    expect(cooldown.reserve(' jana@example.com ', t0 + 1000)).toBeNull();
    cooldown.release('JANA@example.com', token);
    expect(cooldown.reserve('jana@example.com', t0 + 2000)).not.toBeNull();
  });

  it('does not hold one person back for another', () => {
    const cooldown = new ResendCooldown();
    cooldown.reserve('a@example.com', t0);

    expect(cooldown.reserve('b@example.com', t0 + 1000)).not.toBeNull();
  });

  it('never tracks more addresses than it can hold', () => {
    const cooldown = new ResendCooldown();
    for (let i = 0; i < 10_050; i++) {
      cooldown.reserve(`x${i}@example.com`, t0);
    }

    // The oldest were dropped to make room, the newest are still waiting.
    expect(cooldown.reserve('x0@example.com', t0 + 1000)).not.toBeNull();
    expect(cooldown.reserve('x10049@example.com', t0 + 1000)).toBeNull();
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
    ).toBeNull();
  });
});
