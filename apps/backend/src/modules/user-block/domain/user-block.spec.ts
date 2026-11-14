import { orderedPair, userBlockViolations } from './user-block';

describe('user blocks (#239)', () => {
  it('stores a pair the same way whichever side it comes from', () => {
    expect(orderedPair('b', 'a')).toEqual(['a', 'b']);
    expect(orderedPair('a', 'b')).toEqual(['a', 'b']);
  });

  it('does not block a person from themselves', () => {
    expect(userBlockViolations('u1', 'u1')).toEqual(['SAME_USER']);
    expect(userBlockViolations('u1', 'u2')).toEqual([]);
  });
});
