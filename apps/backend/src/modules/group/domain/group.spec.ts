import {
  hasGroupAdminRights,
  isPubliclyVisible,
  MemberAction,
  memberActionViolations,
} from '@/modules/group/domain/group';

describe('hasGroupAdminRights', () => {
  it.each([
    ['OWNER', true],
    ['ADMIN', true],
    ['MEMBER', false],
  ] as const)('%s → %s', (role, expected) => {
    expect(hasGroupAdminRights(role)).toBe(expected);
  });
});

describe('isPubliclyVisible', () => {
  it.each([
    ['PUBLIC', 'ACTIVE', true],
    ['PUBLIC', 'CANCELLED', false],
    ['PRIVATE', 'ACTIVE', false],
    ['PRIVATE', 'CANCELLED', false],
  ] as const)('%s and %s → %s', (visibility, status, expected) => {
    expect(isPubliclyVisible({ visibility, status })).toBe(expected);
  });
});

describe('memberActionViolations', () => {
  const remove: MemberAction = { kind: 'remove' };
  const makeAdmin: MemberAction = { kind: 'setRole', role: 'ADMIN' };
  const demote: MemberAction = { kind: 'setRole', role: 'MEMBER' };
  const transfer: MemberAction = { kind: 'transferOwnership' };

  it.each([
    ['OWNER', 'MEMBER', remove, []],
    ['OWNER', 'ADMIN', remove, []],
    ['ADMIN', 'MEMBER', remove, []],
    ['ADMIN', 'ADMIN', remove, ['NOT_ALLOWED']],
    ['MEMBER', 'MEMBER', remove, ['NOT_ALLOWED']],
    ['ADMIN', 'OWNER', remove, ['NOT_ALLOWED']],
    ['OWNER', 'MEMBER', makeAdmin, []],
    ['OWNER', 'ADMIN', demote, []],
    ['ADMIN', 'MEMBER', makeAdmin, ['NOT_ALLOWED']],
    ['ADMIN', 'ADMIN', demote, ['NOT_ALLOWED']],
    ['ADMIN', 'OWNER', demote, ['NOT_ALLOWED']],
    ['OWNER', 'MEMBER', transfer, []],
    ['OWNER', 'ADMIN', transfer, []],
    ['ADMIN', 'MEMBER', transfer, ['NOT_ALLOWED']],
    ['MEMBER', 'ADMIN', transfer, ['NOT_ALLOWED']],
  ] as const)('%s → %s, %o: %o', (actorRole, targetRole, action, expected) => {
    expect(
      memberActionViolations(
        { userId: 'actor', role: actorRole },
        { userId: 'target', role: targetRole },
        action,
      ),
    ).toEqual(expected);
  });

  it.each([remove, makeAdmin, transfer])(
    'refuses acting on oneself: %o',
    (action) => {
      expect(
        memberActionViolations(
          { userId: 'me', role: 'OWNER' },
          { userId: 'me', role: 'OWNER' },
          action,
        ),
      ).toEqual(['ACTING_ON_SELF']);
    },
  );
});
