import {
  administratorStatusOf,
  deactivationViolations,
  invitationViolations,
  normalizeAdministratorEmail,
  reactivationViolations,
  resendViolations,
} from './administrator';

describe('administratorStatusOf', () => {
  it('is invited until there is a password', () => {
    expect(
      administratorStatusOf({ hasPassword: false, deactivatedAt: null }),
    ).toBe('INVITED');
    expect(
      administratorStatusOf({ hasPassword: true, deactivatedAt: null }),
    ).toBe('ACTIVE');
  });

  it('is deactivated whatever else is true', () => {
    const deactivatedAt = new Date('2026-11-13T10:00:00Z');
    expect(administratorStatusOf({ hasPassword: true, deactivatedAt })).toBe(
      'DEACTIVATED',
    );
    expect(administratorStatusOf({ hasPassword: false, deactivatedAt })).toBe(
      'DEACTIVATED',
    );
  });
});

describe('normalizeAdministratorEmail', () => {
  it('compares addresses without case and spaces', () => {
    expect(normalizeAdministratorEmail('  Jana@Example.COM ')).toBe(
      'jana@example.com',
    );
  });
});

describe('invitationViolations', () => {
  it('lets a new address in', () => {
    expect(invitationViolations(null)).toEqual([]);
  });

  it.each([
    ['ACTIVE', 'ALREADY_ADMINISTRATOR'],
    ['INVITED', 'ALREADY_ADMINISTRATOR'],
    ['DEACTIVATED', 'DEACTIVATED_ADMINISTRATOR'],
  ] as const)('refuses an address that is %s', (status, violation) => {
    expect(invitationViolations({ status })).toEqual([violation]);
  });
});

describe('resendViolations', () => {
  it('sends again only to someone invited', () => {
    expect(resendViolations({ status: 'INVITED' })).toEqual([]);
    expect(resendViolations({ status: 'ACTIVE' })).toEqual(['NOT_INVITED']);
    expect(resendViolations({ status: 'DEACTIVATED' })).toEqual([
      'NOT_INVITED',
    ]);
  });
});

describe('deactivationViolations', () => {
  const colleague = { id: 'a2', status: 'ACTIVE' as const };

  it('lets one remove an active colleague while another stays', () => {
    expect(deactivationViolations(colleague, 'a1', 2)).toEqual([]);
  });

  it('refuses to remove oneself', () => {
    expect(deactivationViolations({ ...colleague, id: 'a1' }, 'a1', 3)).toEqual(
      ['SELF'],
    );
  });

  it('keeps the last active administrator', () => {
    expect(deactivationViolations(colleague, 'a1', 1)).toEqual(['LAST_ACTIVE']);
  });

  it('lets one cancel an invitation even with a single active colleague', () => {
    expect(
      deactivationViolations({ id: 'a2', status: 'INVITED' }, 'a1', 1),
    ).toEqual([]);
  });

  it('does not deactivate twice', () => {
    expect(
      deactivationViolations({ id: 'a2', status: 'DEACTIVATED' }, 'a1', 2),
    ).toEqual(['ALREADY_DEACTIVATED']);
  });
});

describe('reactivationViolations', () => {
  it('gives access back only to a deactivated administrator', () => {
    expect(reactivationViolations({ status: 'DEACTIVATED' })).toEqual([]);
    expect(reactivationViolations({ status: 'ACTIVE' })).toEqual([
      'NOT_DEACTIVATED',
    ]);
  });
});
