import {
  currentMembershipRequestOf,
  MembershipRequest,
  membershipDecisionViolations,
  membershipRuleViolations,
} from './membership-request';

const aRequest = (
  overrides: Partial<MembershipRequest> = {},
): MembershipRequest => ({
  id: 'r1',
  groupId: 'g1',
  userId: 'u1',
  status: 'PENDING',
  message: null,
  requestedAt: new Date('2030-01-01T12:00:00Z'),
  decidedAt: null,
  rejectionReason: null,
  ...overrides,
});

describe('membershipRuleViolations', () => {
  it('lets someone outside the group with no requests ask', () => {
    expect(membershipRuleViolations(null, [])).toEqual([]);
  });

  it.each(['OWNER', 'ADMIN', 'MEMBER'] as const)(
    'refuses a %s, who is in the group already',
    (role) => {
      expect(membershipRuleViolations(role, [])).toEqual(['IS_MEMBER']);
    },
  );

  it('refuses a second waiting request', () => {
    expect(membershipRuleViolations(null, [{ status: 'PENDING' }])).toEqual([
      'ALREADY_REQUESTED',
    ]);
  });

  it('refuses anyone rejected before, for good (ADR-0014)', () => {
    expect(
      membershipRuleViolations(null, [
        { status: 'REJECTED' },
        { status: 'WITHDRAWN' },
      ]),
    ).toEqual(['REJECTED_BEFORE']);
  });

  it('lets someone who withdrew ask again', () => {
    expect(
      membershipRuleViolations(null, [
        { status: 'WITHDRAWN' },
        { status: 'WITHDRAWN' },
      ]),
    ).toEqual([]);
  });

  it('lets a former member who left ask again', () => {
    expect(membershipRuleViolations(null, [{ status: 'APPROVED' }])).toEqual(
      [],
    );
  });
});

describe('membershipDecisionViolations', () => {
  it('lets an admin decide a waiting request in an active group', () => {
    expect(
      membershipDecisionViolations({ status: 'ACTIVE' }, { status: 'PENDING' }),
    ).toEqual([]);
  });

  it('refuses a request that no longer waits', () => {
    expect(
      membershipDecisionViolations(
        { status: 'ACTIVE' },
        { status: 'WITHDRAWN' },
      ),
    ).toEqual(['NOT_PENDING']);
  });

  it('refuses any decision in a cancelled group', () => {
    expect(
      membershipDecisionViolations(
        { status: 'CANCELLED' },
        { status: 'PENDING' },
      ),
    ).toEqual(['GROUP_CANCELLED']);
  });
});

describe('currentMembershipRequestOf', () => {
  it('is null without requests', () => {
    expect(currentMembershipRequestOf([])).toBeNull();
  });

  it('prefers the waiting request over a past decision', () => {
    const pending = aRequest({ id: 'pending' });
    const approved = aRequest({
      id: 'approved',
      status: 'APPROVED',
      requestedAt: new Date('2030-02-01T12:00:00Z'),
    });
    expect(currentMembershipRequestOf([approved, pending])).toBe(pending);
  });

  it('shows the latest decision and ignores withdrawn requests', () => {
    const older = aRequest({
      id: 'older',
      status: 'APPROVED',
      requestedAt: new Date('2030-01-01T12:00:00Z'),
    });
    const newer = aRequest({
      id: 'newer',
      status: 'APPROVED',
      requestedAt: new Date('2030-03-01T12:00:00Z'),
    });
    const withdrawn = aRequest({ id: 'withdrawn', status: 'WITHDRAWN' });
    expect(currentMembershipRequestOf([older, withdrawn, newer])).toBe(newer);
    expect(currentMembershipRequestOf([withdrawn])).toBeNull();
  });
});
