import {
  assignViolations,
  isOpen,
  reopenViolations,
  reportRuleViolations,
  resolveViolations,
  statusesOf,
} from './report';

// #240, ADR-0023.

describe('reportRuleViolations', () => {
  it('lets a user report someone else', () => {
    expect(
      reportRuleViolations({
        reporterId: 'u1',
        target: { type: 'USER', id: 'u2' },
      }),
    ).toEqual([]);
  });

  it('refuses a report of oneself', () => {
    expect(
      reportRuleViolations({
        reporterId: 'u1',
        target: { type: 'USER', id: 'u1' },
      }),
    ).toEqual(['SELF']);
  });

  it('lets a user report an event someone else organizes', () => {
    expect(
      reportRuleViolations({
        reporterId: 'u1',
        target: { type: 'EVENT', id: 'e1' },
        organizerIds: ['u2', 'u3'],
      }),
    ).toEqual([]);
  });

  it.each([
    ['the main organizer', ['u1', 'u2']],
    ['a co-organizer', ['u2', 'u1']],
  ])('refuses a report of an event by %s', (_, organizerIds) => {
    expect(
      reportRuleViolations({
        reporterId: 'u1',
        target: { type: 'EVENT', id: 'e1' },
        organizerIds,
      }),
    ).toEqual(['OWN_EVENT']);
  });

  it('compares the reporter with the organizers of an event, not with its id', () => {
    expect(
      reportRuleViolations({
        reporterId: 'u1',
        target: { type: 'EVENT', id: 'u1' },
      }),
    ).toEqual([]);
  });
});

describe('the queue filter', () => {
  it('means new and in progress by OPEN', () => {
    expect(statusesOf('OPEN')).toEqual(['NEW', 'IN_PROGRESS']);
  });

  it('means every state by ALL', () => {
    expect(statusesOf('ALL')).toEqual(['NEW', 'IN_PROGRESS', 'RESOLVED']);
  });

  it('means the one state otherwise', () => {
    expect(statusesOf('RESOLVED')).toEqual(['RESOLVED']);
  });

  it('counts only a resolved report as closed', () => {
    expect([isOpen('NEW'), isOpen('IN_PROGRESS'), isOpen('RESOLVED')]).toEqual([
      true,
      true,
      false,
    ]);
  });
});

describe('assignViolations', () => {
  it('lets anyone take a new report', () => {
    expect(assignViolations({ status: 'NEW', assigneeId: null }, 'a1')).toEqual(
      [],
    );
  });

  it('lets a report in progress go to someone else', () => {
    expect(
      assignViolations({ status: 'IN_PROGRESS', assigneeId: 'a1' }, 'a2'),
    ).toEqual([]);
  });

  it('refuses to give a report to whoever has it already', () => {
    expect(
      assignViolations({ status: 'IN_PROGRESS', assigneeId: 'a1' }, 'a1'),
    ).toEqual(['ALREADY_ASSIGNED']);
  });

  it('refuses a resolved report: it has to be reopened first', () => {
    expect(
      assignViolations({ status: 'RESOLVED', assigneeId: 'a1' }, 'a2'),
    ).toEqual(['ALREADY_RESOLVED']);
  });
});

describe('resolveViolations', () => {
  it.each(['NEW', 'IN_PROGRESS'] as const)(
    'resolves a report that is %s',
    (status) => {
      expect(resolveViolations({ status, assigneeId: null })).toEqual([]);
    },
  );

  it('refuses a resolved one', () => {
    expect(resolveViolations({ status: 'RESOLVED', assigneeId: 'a1' })).toEqual(
      ['ALREADY_RESOLVED'],
    );
  });
});

describe('reopenViolations', () => {
  it('reopens a resolved report', () => {
    expect(reopenViolations({ status: 'RESOLVED', assigneeId: 'a1' })).toEqual(
      [],
    );
  });

  it.each(['NEW', 'IN_PROGRESS'] as const)(
    'refuses a report that is %s',
    (status) => {
      expect(reopenViolations({ status, assigneeId: null })).toEqual([
        'NOT_RESOLVED',
      ]);
    },
  );
});
