// F-09.5, ADR-0018: the vocabulary of the e-mail outbox. Plain TypeScript:
// the rules for when an e-mail may go, when to try again and when to give up,
// tested by calling them.

export const EMAIL_KINDS = [
  'VERIFY_EMAIL',
  'RESET_PASSWORD',
  'NOTIFICATION',
  // ADR-0021: a new administrator sets their password.
  'ADMIN_INVITATION',
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const EMAIL_SKIP_REASONS = ['UNVERIFIED', 'RECIPIENT_CAP'] as const;
export type EmailSkipReason = (typeof EMAIL_SKIP_REASONS)[number];

// Whose e-mail it is: a user's, or an administrator's (ADR-0021), never both.
export type EmailRecipient =
  | { recipientId: string; administratorId?: never }
  | { administratorId: string; recipientId?: never };

// What the places that send an e-mail hand to the outbox: rendered already,
// so a retry sends exactly what was meant.
export type OutgoingEmail = EmailRecipient & {
  kind: EmailKind;
  // Goes first, and may use the reserve of the daily budget.
  critical: boolean;
  to: string;
  subject: string;
  html: string;
  // At most one e-mail per notification: a second one with the same id is
  // dropped.
  notificationId?: string;
  // Recorded, never sent.
  skipReason?: EmailSkipReason;
};

// A row of the outbox the poller is about to send.
export type DueEmail = {
  id: string;
  critical: boolean;
  // Null for an administrator's e-mail, which the per-recipient cap skips.
  recipientId: string | null;
  to: string;
  subject: string;
  html: string;
  attempts: number;
};

// One send and four more tries; the CHECK on `attempts` in the migration
// keeps the same bound.
export const MAX_ATTEMPTS = 5;

// The pause before the 2nd, 3rd, 4th and 5th attempt.
export const RETRY_DELAYS_MS = [
  60_000, // 1 min
  5 * 60_000, // 5 min
  30 * 60_000, // 30 min
  2 * 60 * 60_000, // 2 h
] as const;

/**
 * When to try again after the attempt number `attempts` (1 for the first
 * send) failed for a temporary reason. Null when that was the last attempt.
 */
export const nextAttemptAt = (attempts: number, now: Date): Date | null => {
  if (attempts >= MAX_ATTEMPTS) return null;
  const delay = RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length) - 1];
  return new Date(now.getTime() + delay);
};

// What an adapter's error may carry: nodemailer puts the SMTP reply code in
// `responseCode` and its own kind of error in `code`; the Resend adapter puts
// the HTTP status in `statusCode`.
type ProviderError = {
  responseCode?: unknown;
  code?: unknown;
  statusCode?: unknown;
};

// The HTTP status with which Resend refuses the message itself (an invalid
// address, a missing field). 401/403 is the API key, 429 the rate limit and
// 5xx the provider: all of them may pass later.
const HTTP_UNPROCESSABLE = 422;

/**
 * Whether trying again cannot help. An SMTP 5xx reply refuses this message
 * for good (unknown mailbox, rejected content). A refused login (EAUTH) is a
 * 5xx too, but it is the server's configuration, not the message: once the
 * credentials are fixed the same message goes, so it is tried again. Over
 * HTTP the same holds for a 422 from Resend. Anything else (4xx, a dropped
 * connection, a timeout, another HTTP status) is temporary.
 */
export const isPermanentFailure = (error: unknown): boolean => {
  if (error === null || typeof error !== 'object') return false;
  const { responseCode, code, statusCode } = error as ProviderError;
  if (statusCode === HTTP_UNPROCESSABLE) return true;
  if (code === 'EAUTH') return false;
  return (
    typeof responseCode === 'number' &&
    responseCode >= 500 &&
    responseCode < 600
  );
};

export const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export type EmailBudget = {
  // How many e-mails may go in any 24 hours (the provider's daily limit).
  dailyLimit: number;
  // The share of it only critical e-mails may use.
  criticalReservePercent: number;
};

export type SendableNow = 'ALL' | 'CRITICAL_ONLY' | 'NONE';

/**
 * Which e-mails may go now, given how many went in the last 24 hours. The
 * non-critical ones stop where the reserve begins and wait for the window to
 * move on; the critical ones may go up to the whole limit.
 */
export const sendableNow = (
  sentInLast24h: number,
  budget: EmailBudget,
): SendableNow => {
  const reserve = Math.ceil(
    (budget.dailyLimit * budget.criticalReservePercent) / 100,
  );
  if (sentInLast24h >= budget.dailyLimit) return 'NONE';
  if (sentInLast24h >= budget.dailyLimit - reserve) return 'CRITICAL_ONLY';
  return 'ALL';
};

export const DAY_MS = 24 * 60 * 60_000;
export const HOUR_MS = 60 * 60_000;
