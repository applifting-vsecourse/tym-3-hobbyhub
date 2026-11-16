import {
  friendPairOf,
  friendRequestNotifyWindowStart,
  friendRequestViolations,
  isFriendRequestNotified,
  relationOf,
} from './friendship';

describe('isFriendRequestNotified', () => {
  // #225: the recipient hears of the first 3 requests from a sender an hour.
  it.each([
    [0, true],
    [2, true],
    [3, false],
    [10, false],
  ])('after %i earlier requests: %p', (earlier, notified) => {
    expect(isFriendRequestNotified(earlier)).toBe(notified);
  });

  it('counts the hour before the new request', () => {
    expect(
      friendRequestNotifyWindowStart(new Date('2026-11-15T12:30:00Z')),
    ).toEqual(new Date('2026-11-15T11:30:00Z'));
  });
});

describe('relationOf', () => {
  it('has no relation without a friendship or a pending request', () => {
    expect(relationOf('me', { isFriend: false, pendingRequest: null })).toBe(
      'none',
    );
  });

  it('tells a request I sent from one sent to me', () => {
    expect(
      relationOf('me', { isFriend: false, pendingRequest: { senderId: 'me' } }),
    ).toBe('request_sent');
    expect(
      relationOf('me', {
        isFriend: false,
        pendingRequest: { senderId: 'libor' },
      }),
    ).toBe('request_received');
  });

  it('puts the friendship before any request', () => {
    expect(
      relationOf('me', { isFriend: true, pendingRequest: { senderId: 'me' } }),
    ).toBe('friends');
  });
});

describe('friendPairOf', () => {
  it('stores the pair the same way whichever way round it is asked', () => {
    expect(friendPairOf('u1', 'u2')).toEqual({ userAId: 'u1', userBId: 'u2' });
    expect(friendPairOf('u2', 'u1')).toEqual({ userAId: 'u1', userBId: 'u2' });
  });

  // The database CHECK compares bytes (COLLATE "C"): upper case sorts first.
  it('orders by bytes, not by a locale', () => {
    expect(friendPairOf('b1', 'B2')).toEqual({ userAId: 'B2', userBId: 'b1' });
  });

  it('orders letters with diacritics by their bytes too', () => {
    expect(friendPairOf('é', 'z')).toEqual({ userAId: 'z', userBId: 'é' });
  });

  // UTF-16 (JavaScript's `<`) puts the emoji first; UTF-8 bytes and code
  // points put U+FFFD first, as the database does.
  it('orders a character outside the BMP after U+E000–U+FFFF, as the bytes do', () => {
    const emoji = 'x-\u{1F600}';
    const replacement = 'x-\uFFFD';
    expect(emoji < replacement).toBe(true);
    expect(friendPairOf(emoji, replacement)).toEqual({
      userAId: replacement,
      userBId: emoji,
    });
    expect(friendPairOf(replacement, emoji)).toEqual({
      userAId: replacement,
      userBId: emoji,
    });
  });

  it('puts a prefix first', () => {
    expect(friendPairOf('u10', 'u1')).toEqual({
      userAId: 'u1',
      userBId: 'u10',
    });
  });
});

describe('friendRequestViolations', () => {
  it('accepts a request to someone else', () => {
    expect(friendRequestViolations('u1', 'u2')).toEqual([]);
  });

  it('refuses a request to oneself', () => {
    expect(friendRequestViolations('u1', 'u1')).toEqual(['SELF_REQUEST']);
  });
});
