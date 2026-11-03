// F-03.2: "send the verification e-mail again" at most once a minute per
// address. BetterAuth's own limiter counts per client IP, and behind a proxy
// that can be one bucket for everybody, so one person's click would block the
// next person's; it stays only as a coarse cap on top. Kept in memory: one
// backend instance, and a restart only lets one more e-mail through.

export const RESEND_COOLDOWN_MS = 60_000;

// Anyone can post any address, so the map must not grow without bound.
const MAX_TRACKED_ADDRESSES = 10_000;

export class ResendCooldown {
  private readonly lastSentAt = new Map<string, number>();
  private lastPrunedAt = 0;

  /** Seconds the address still has to wait, or 0 when it may be sent to now. */
  waitSeconds(email: string, now: number = Date.now()): number {
    const sentAt = this.lastSentAt.get(this.keyOf(email));
    if (sentAt === undefined || now - sentAt >= RESEND_COOLDOWN_MS) return 0;
    return Math.ceil((RESEND_COOLDOWN_MS - (now - sentAt)) / 1000);
  }

  /**
   * Notes that an e-mail went out, so the next one waits. Called after the
   * send succeeded: a failed one does not use up the minute.
   */
  record(email: string, now: number = Date.now()): void {
    this.prune(now);
    const key = this.keyOf(email);
    // Delete first, so the map's insertion order stays the order of sends.
    this.lastSentAt.delete(key);
    this.lastSentAt.set(key, now);
  }

  private keyOf(email: string): string {
    return email.trim().toLowerCase();
  }

  // At most once per cooldown, so a request does not pay for a full scan. If
  // it is still full of live entries, the oldest go.
  private prune(now: number): void {
    if (now - this.lastPrunedAt >= RESEND_COOLDOWN_MS) {
      this.lastPrunedAt = now;
      for (const [key, sentAt] of this.lastSentAt) {
        if (now - sentAt >= RESEND_COOLDOWN_MS) this.lastSentAt.delete(key);
      }
    }
    while (this.lastSentAt.size >= MAX_TRACKED_ADDRESSES) {
      const oldest = this.lastSentAt.keys().next();
      if (oldest.done) break;
      this.lastSentAt.delete(oldest.value);
    }
  }
}

// One for the whole backend: the hook asks it, the sender records into it.
export const resendCooldown = new ResendCooldown();
