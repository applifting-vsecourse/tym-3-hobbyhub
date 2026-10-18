import { hasGroupAdminRights } from '@/modules/group/domain/group';

describe('hasGroupAdminRights', () => {
  it.each([
    ['OWNER', true],
    ['ADMIN', true],
    ['MEMBER', false],
  ] as const)('%s → %s', (role, expected) => {
    expect(hasGroupAdminRights(role)).toBe(expected);
  });
});
