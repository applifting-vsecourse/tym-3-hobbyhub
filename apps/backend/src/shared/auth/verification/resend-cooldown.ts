// F-03.2: the verification e-mail goes to one address at most once a minute.
// BetterAuth's own limiter counts per client IP, and behind a proxy that can be
// one bucket for everybody, so one person's click would block the next
// person's; it stays only as a coarse cap on top. Kept in memory: one backend
// instance, and a restart only lets one more e-mail through.

export const RESEND_COOLDOWN_MS = 60_000;

// Anyone can post any address, so the map must not grow without bound.
const MAX_TRACKED_ADDRESSES = 10_000;

type Reservation = { sentAt: number; token: number };

export class ResendCooldown {
  private readonly reservations = new Map<string, Reservation>();
  private lastPrunedAt = 0;
  private nextToken = 1;

  /**
   * Reserves the send to this address: a token when it may go now, null while
   * the last one is less than a minute old. The check and the reservation are
   * one step, so two requests at the same moment cannot both get a token. Give
   * the token back to `release` when the send fails.
   */
  reserve(email: string, now: number = Date.now()): number | null {
    const key = this.keyOf(email);
    const current = this.reservations.get(key);
    if (current !== undefined && now - current.sentAt < RESEND_COOLDOWN_MS) {
      return null;
    }
    this.prune(now);
    const token = this.nextToken++;
    // Delete first, so the map's insertion order stays the order of sends.
    this.reservations.delete(key);
    this.reservations.set(key, { sentAt: now, token });
    return token;
  }

  /**
   * A failed send does not use up the minute. Only the reservation it was made
   * under is given back: a later one, made after this expired, stays.
   */
  release(email: string, token: number): void {
    const key = this.keyOf(email);
    if (this.reservations.get(key)?.token === token) {
      this.reservations.delete(key);
    }
  }

  private keyOf(email: string): string {
    return email.trim().toLowerCase();
  }

  // At most once per cooldown, so a request does not pay for a full scan. If
  // it is still full of live entries, the oldest go.
  private prune(now: number): void {
    if (now - this.lastPrunedAt >= RESEND_COOLDOWN_MS) {
      this.lastPrunedAt = now;
      for (const [key, { sentAt }] of this.reservations) {
        if (now - sentAt >= RESEND_COOLDOWN_MS) this.reservations.delete(key);
      }
    }
    while (this.reservations.size >= MAX_TRACKED_ADDRESSES) {
      const oldest = this.reservations.keys().next();
      if (oldest.done) break;
      this.reservations.delete(oldest.value);
    }
  }
}

// One for the whole backend.
export const resendCooldown = new ResendCooldown();
