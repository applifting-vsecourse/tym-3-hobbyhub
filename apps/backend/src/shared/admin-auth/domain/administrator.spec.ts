import {
  ADMIN_NAME_MAX_LENGTH,
  ADMIN_PASSWORD_MIN_LENGTH,
  administratorRuleViolations,
} from './administrator';

describe('administratorRuleViolations', () => {
  const valid = {
    email: 'jana@example.com',
    name: 'Jana',
    password: 'x'.repeat(ADMIN_PASSWORD_MIN_LENGTH),
  };

  it('accepts a valid administrator', () => {
    expect(administratorRuleViolations(valid)).toEqual([]);
  });

  it.each([
    ['an address without @', { email: 'jana.example.com' }, 'EMAIL_INVALID'],
    ['a blank name', { name: '   ' }, 'NAME_REQUIRED'],
    [
      'a long name',
      { name: 'x'.repeat(ADMIN_NAME_MAX_LENGTH + 1) },
      'NAME_TOO_LONG',
    ],
    [
      'a short password',
      { password: 'x'.repeat(ADMIN_PASSWORD_MIN_LENGTH - 1) },
      'PASSWORD_TOO_SHORT',
    ],
  ])('refuses %s', (_, change, violation) => {
    expect(administratorRuleViolations({ ...valid, ...change })).toEqual([
      violation,
    ]);
  });
});
