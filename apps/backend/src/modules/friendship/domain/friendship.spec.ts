import { friendPairOf, friendRequestViolations } from './friendship';

describe('friendPairOf', () => {
  it('stores the pair the same way whichever way round it is asked', () => {
    expect(friendPairOf('u1', 'u2')).toEqual({ userAId: 'u1', userBId: 'u2' });
    expect(friendPairOf('u2', 'u1')).toEqual({ userAId: 'u1', userBId: 'u2' });
  });

  // The database CHECK compares bytes (COLLATE "C"): upper case sorts first.
  it('orders by bytes, not by a locale', () => {
    expect(friendPairOf('b1', 'B2')).toEqual({ userAId: 'B2', userBId: 'b1' });
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
