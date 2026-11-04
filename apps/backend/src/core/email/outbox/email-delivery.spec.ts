import {
  isPermanentFailure,
  MAX_ATTEMPTS,
  nextAttemptAt,
  sendableNow,
} from './email-delivery';

const now = new Date('2030-01-01T12:00:00Z');
const minutesLater = (date: Date | null): number | null =>
  date ? (date.getTime() - now.getTime()) / 60_000 : null;

describe('nextAttemptAt', () => {
  it('waits longer after each failed attempt: 1 min, 5 min, 30 min, 2 h', () => {
    expect(
      [1, 2, 3, 4].map((n) => minutesLater(nextAttemptAt(n, now))),
    ).toEqual([1, 5, 30, 120]);
  });

  it('gives up after the fifth attempt', () => {
    expect(MAX_ATTEMPTS).toBe(5);
    expect(nextAttemptAt(5, now)).toBeNull();
  });
});

describe('isPermanentFailure', () => {
  it('takes an SMTP 5xx reply as final', () => {
    expect(isPermanentFailure({ responseCode: 550 })).toBe(true);
  });

  it('tries a refused login again: it is the configuration, not the message', () => {
    expect(isPermanentFailure({ responseCode: 535, code: 'EAUTH' })).toBe(
      false,
    );
  });

  it.each([
    ['a 4xx reply', { responseCode: 421 }],
    ['a dropped connection', { code: 'ECONNECTION' }],
    ['a plain error', new Error('Resend delivery failed: timeout')],
    ['something that is not an error', 'boom'],
  ])('tries %s again', (_, error) => {
    expect(isPermanentFailure(error)).toBe(false);
  });
});

describe('sendableNow', () => {
  const budget = { dailyLimit: 200, criticalReservePercent: 20 };

  it('sends everything while the shared part of the budget lasts', () => {
    expect(sendableNow(159, budget)).toBe('ALL');
  });

  it('keeps the reserve for critical e-mails', () => {
    expect(sendableNow(160, budget)).toBe('CRITICAL_ONLY');
    expect(sendableNow(199, budget)).toBe('CRITICAL_ONLY');
  });

  it('sends nothing once the whole daily limit is used', () => {
    expect(sendableNow(200, budget)).toBe('NONE');
  });

  it('rounds the reserve up, so a small limit still keeps one', () => {
    expect(sendableNow(9, { dailyLimit: 10, criticalReservePercent: 5 })).toBe(
      'CRITICAL_ONLY',
    );
  });

  it('without a reserve treats every e-mail alike', () => {
    expect(
      sendableNow(199, { dailyLimit: 200, criticalReservePercent: 0 }),
    ).toBe('ALL');
  });
});
