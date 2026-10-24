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
