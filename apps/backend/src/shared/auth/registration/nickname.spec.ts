import {
  NICKNAME_CHANGE_COOLDOWN_DAYS,
  nicknameChangeableFrom,
  nicknamePreviousChangeAtMost,
  nicknameViolation,
  normalizeNickname,
} from './nickname';

describe('nicknameViolation', () => {
  it.each(['CaffeinatedDuck', 'jan.novak', 'kacka_92', 'abc', 'a'.repeat(30)])(
    'accepts %p',
    (value) => {
      expect(nicknameViolation(value)).toBeNull();
    },
  );

  it.each([
    ['too short', 'ab', 'NICKNAME_TOO_SHORT'],
    ['too long', 'a'.repeat(31), 'NICKNAME_TOO_LONG'],
    ['a space', 'Jan Novak', 'NICKNAME_INVALID'],
    ['diacritics', 'Kačka', 'NICKNAME_INVALID'],
    ['a dash', 'jan-novak', 'NICKNAME_INVALID'],
    ['not a string', 42, 'NICKNAME_INVALID'],
    ['nothing', undefined, 'NICKNAME_INVALID'],
  ])('refuses %s', (_, value, code) => {
    expect(nicknameViolation(value)).toBe(code);
  });

  it.each(['admin', 'Admin_2', 'HobbyHubTeam', 'xSUPPORTx', 'spravce.cz'])(
    'refuses %p, which contains a reserved word',
    (value) => {
      expect(nicknameViolation(value)).toBe('NICKNAME_RESERVED');
    },
  );

  it.each(['BadmintonPetr', 'badminton_92', 'EcosystemFan'])(
    'accepts %p, where the reserved word is part of an ordinary one',
    (value) => {
      expect(nicknameViolation(value)).toBeNull();
    },
  );

  it('still refuses a reserved word next to an ordinary one', () => {
    expect(nicknameViolation('BadmintonAdmin')).toBe('NICKNAME_RESERVED');
    expect(nicknameViolation('SystemEcosystem')).toBe('NICKNAME_RESERVED');
  });

  it('refuses "mod" on its own, but not inside another word', () => {
    expect(nicknameViolation('MOD')).toBe('NICKNAME_RESERVED');
    expect(nicknameViolation('Modrak')).toBeNull();
  });
});

describe('normalizeNickname', () => {
  it('ignores letter case', () => {
    expect(normalizeNickname('CaffeinatedDuck')).toBe('caffeinatedduck');
  });
});

describe('nicknameChangeableFrom', () => {
  const NOW = new Date('2026-11-15T12:00:00Z');
  const daysAgo = (days: number): Date =>
    new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

  it('lets someone who never changed it change it now', () => {
    expect(nicknameChangeableFrom(null, NOW)).toBeNull();
  });

  it('waits 30 days after the last change', () => {
    expect(nicknameChangeableFrom(daysAgo(10), NOW)).toEqual(
      new Date(daysAgo(10).getTime() + NICKNAME_CHANGE_COOLDOWN_DAYS * 864e5),
    );
  });

  it('lets them change it once the 30 days are over', () => {
    expect(nicknameChangeableFrom(daysAgo(30), NOW)).toBeNull();
  });
});

describe('nicknamePreviousChangeAtMost', () => {
  it('is 30 days back, the same bound as nicknameChangeableFrom', () => {
    const now = new Date('2026-11-15T12:00:00Z');
    const bound = nicknamePreviousChangeAtMost(now);
    expect(bound).toEqual(new Date('2026-10-16T12:00:00Z'));
    expect(nicknameChangeableFrom(bound, now)).toBeNull();
    expect(
      nicknameChangeableFrom(new Date(bound.getTime() + 1), now),
    ).not.toBeNull();
  });
});
