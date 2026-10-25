import {
  hasGroupAdminRights,
  isPubliclyVisible,
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
