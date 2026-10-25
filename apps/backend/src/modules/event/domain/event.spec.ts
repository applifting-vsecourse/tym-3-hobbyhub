import {
  eventChangeViolations,
  eventRuleViolations,
  foldForSearch,
  occupancyOf,
} from '@/modules/event/domain/event';

describe('occupancyOf', () => {
  it('adds seats taken outside the app to the approved participants', () => {
    expect(
      occupancyOf({
        minParticipants: 8,
        maxParticipants: 12,
        externalOccupiedSpots: 4,
        approvedCount: 1,
      }),
    ).toEqual({
      externalOccupiedSpots: 4,
      approvedCount: 1,
      occupiedSpots: 5,
      missingToMinimum: 3,
      freeSpots: 7,
      fillState: 'BELOW_MINIMUM',
    });
  });

  it.each([
    [8, 'MINIMUM_REACHED'],
    [12, 'FULL'],
  ] as const)('with %i occupied the state is %s', (occupied, fillState) => {
    expect(
      occupancyOf({
        minParticipants: 8,
        maxParticipants: 12,
        externalOccupiedSpots: occupied,
        approvedCount: 0,
      }),
    ).toMatchObject({ missingToMinimum: 0, fillState });
  });
});

describe('eventRuleViolations', () => {
  const now = new Date('2026-10-19T10:00:00Z');
  const valid = {
    startAt: new Date('2026-10-22T18:00:00Z'),
    endAt: new Date('2026-10-22T19:30:00Z'),
    minParticipants: 8,
    maxParticipants: 12,
    externalOccupiedSpots: 4,
  };

  it('accepts a sound event', () => {
    expect(eventRuleViolations(valid, now)).toEqual([]);
  });

  it.each([
    ['START_NOT_IN_FUTURE', { startAt: now }],
    [
      'START_NOT_IN_FUTURE',
      {
        startAt: new Date('2026-10-18T18:00:00Z'),
        endAt: new Date('2026-10-18T19:00:00Z'),
      },
    ],
    ['END_NOT_AFTER_START', { endAt: valid.startAt }],
    ['MIN_ABOVE_MAX', { minParticipants: 13 }],
    ['OCCUPIED_ABOVE_MAX', { externalOccupiedSpots: 13 }],
    ['NOTE_WITHOUT_AMOUNT', { contributionNote: 'na místě' }],
  ] as const)('reports %s', (violation, override) => {
    expect(eventRuleViolations({ ...valid, ...override }, now)).toContain(
      violation,
    );
  });

  it('reports every broken rule at once', () => {
    expect(
      eventRuleViolations(
        { ...valid, minParticipants: 20, externalOccupiedSpots: 15 },
        now,
      ),
    ).toEqual(['MIN_ABOVE_MAX', 'OCCUPIED_ABOVE_MAX']);
  });
});

describe('foldForSearch', () => {
  it('ignores case, diacritics and outer spaces', () => {
    expect(foldForSearch('  Čtvrteční FLORBAL ')).toBe('ctvrtecni florbal');
    expect(foldForSearch('Brno-Žabovřesky')).toBe('brno-zabovresky');
  });
});

describe('eventChangeViolations', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const later = new Date('2026-10-24T12:00:00Z');
  const event = {
    status: 'PUBLISHED' as const,
    venueType: 'PUBLIC_VENUE' as const,
    startAt: later,
    externalOccupiedSpots: 4,
    approvedCount: 3,
  };

  it('lets a future event be edited', () => {
    expect(
      eventChangeViolations(
        event,
        {
          kind: 'update',
          maxParticipants: 7,
          externalOccupiedSpots: 4,
          venueType: 'PUBLIC_VENUE',
          hasLocation: true,
        },
        now,
      ),
    ).toEqual([]);
  });

  it('lets a draft be edited', () => {
    expect(
      eventChangeViolations(
        { ...event, status: 'DRAFT' },
        {
          kind: 'update',
          maxParticipants: 12,
          externalOccupiedSpots: 4,
          venueType: 'PUBLIC_VENUE',
          hasLocation: true,
        },
        now,
      ),
    ).toEqual([]);
  });

  it('refuses a capacity below the occupied seats', () => {
    expect(
      eventChangeViolations(
        event,
        {
          kind: 'update',
          maxParticipants: 6,
          externalOccupiedSpots: 4,
          venueType: 'PUBLIC_VENUE',
          hasLocation: true,
        },
        now,
      ),
    ).toEqual(['MAX_BELOW_OCCUPIED']);
  });

  it('counts the outside seats of the edit itself', () => {
    expect(
      eventChangeViolations(
        event,
        {
          kind: 'update',
          maxParticipants: 6,
          externalOccupiedSpots: 3,
          venueType: 'PUBLIC_VENUE',
          hasLocation: true,
        },
        now,
      ),
    ).toEqual([]);
  });

  it.each([
    ['has started', { startAt: now }],
    ['is cancelled', { status: 'CANCELLED' as const }],
    ['is finished', { status: 'FINISHED' as const }],
  ])('refuses editing an event that %s', (_, override) => {
    expect(
      eventChangeViolations(
        { ...event, ...override },
        {
          kind: 'update',
          maxParticipants: 12,
          externalOccupiedSpots: 4,
          venueType: 'PUBLIC_VENUE',
          hasLocation: true,
        },
        now,
      ),
    ).toEqual(['EVENT_NOT_CHANGEABLE']);
  });

  it('lets an online event be edited without an address', () => {
    expect(
      eventChangeViolations(
        { ...event, venueType: 'ONLINE' },
        {
          kind: 'update',
          maxParticipants: 12,
          externalOccupiedSpots: 4,
          venueType: 'ONLINE',
          hasLocation: false,
        },
        now,
      ),
    ).toEqual([]);
  });

  it.each([
    ['an online event to a place', 'ONLINE' as const, 'PUBLIC_VENUE' as const],
    ['a place to online', 'PUBLIC_VENUE' as const, 'ONLINE' as const],
  ])('refuses turning %s', (_, from, to) => {
    expect(
      eventChangeViolations(
        { ...event, venueType: from },
        {
          kind: 'update',
          maxParticipants: 12,
          externalOccupiedSpots: 4,
          venueType: to,
          hasLocation: to !== 'ONLINE',
        },
        now,
      ),
    ).toEqual(['VENUE_KIND_CHANGED']);
  });

  it('requires an address for an event at a place', () => {
    expect(
      eventChangeViolations(
        event,
        {
          kind: 'update',
          maxParticipants: 12,
          externalOccupiedSpots: 4,
          venueType: 'PUBLIC_VENUE',
          hasLocation: false,
        },
        now,
      ),
    ).toEqual(['LOCATION_REQUIRED']);
  });

  it('refuses an address for an online event', () => {
    expect(
      eventChangeViolations(
        { ...event, venueType: 'ONLINE' },
        {
          kind: 'update',
          maxParticipants: 12,
          externalOccupiedSpots: 4,
          venueType: 'ONLINE',
          hasLocation: true,
        },
        now,
      ),
    ).toEqual(['LOCATION_NOT_ALLOWED']);
  });

  it('lets a published future event be cancelled', () => {
    expect(eventChangeViolations(event, { kind: 'cancel' }, now)).toEqual([]);
  });

  it.each([
    ['has started', { startAt: now }],
    ['is a draft', { status: 'DRAFT' as const }],
    ['is already cancelled', { status: 'CANCELLED' as const }],
  ])('refuses cancelling an event that %s', (_, override) => {
    expect(
      eventChangeViolations({ ...event, ...override }, { kind: 'cancel' }, now),
    ).toEqual(['EVENT_NOT_CANCELLABLE']);
  });
});

describe('eventRuleViolations: position', () => {
  const base = {
    startAt: new Date('2030-01-15T18:00:00Z'),
    endAt: new Date('2030-01-15T19:00:00Z'),
    minParticipants: 2,
    maxParticipants: 4,
    externalOccupiedSpots: 0,
  };
  const now = new Date('2029-01-01T00:00:00Z');

  it('accepts no position and a whole one', () => {
    expect(eventRuleViolations(base, now)).toEqual([]);
    expect(
      eventRuleViolations(
        { ...base, location: { latitude: 50.1, longitude: 14.4 } },
        now,
      ),
    ).toEqual([]);
  });

  it.each([[{ latitude: 50.1 }], [{ longitude: 14.4 }]])(
    'refuses half a position %j',
    (location) => {
      expect(eventRuleViolations({ ...base, location }, now)).toEqual([
        'POSITION_INCOMPLETE',
      ]);
    },
  );
});
