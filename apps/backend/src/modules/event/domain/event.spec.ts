import {
  eventRuleViolations,
  foldForSearch,
  isOrganizerOf,
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

describe('isOrganizerOf', () => {
  const event = { organizerIds: ['organizer', 'co-organizer'] };

  it.each(['organizer', 'co-organizer'])('lets the %s run the event', (id) => {
    expect(isOrganizerOf(event, id)).toBe(true);
  });

  it('keeps anyone else out', () => {
    expect(isOrganizerOf(event, 'stranger')).toBe(false);
    expect(isOrganizerOf({ organizerIds: [] }, 'organizer')).toBe(false);
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
