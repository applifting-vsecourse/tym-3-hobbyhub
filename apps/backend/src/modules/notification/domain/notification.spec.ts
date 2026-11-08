import {
  eventChangesOf,
  EventWhenAndWhere,
  NOTIFICATION_KINDS,
  NOTIFICATION_TYPES,
  notificationTypesOf,
  recipientsExcept,
} from './notification';

describe('notificationTypesOf', () => {
  it.each([
    ['NEW_REQUESTS', 'requests'],
    ['REQUEST_DECIDED', 'requests'],
    ['PARTICIPANT_CANCELLED', 'requests'],
    ['CONFIRMATION_PROMPT', 'requests'],
    ['SPOT_AVAILABLE', 'requests'],
    ['EVENT_CHANGED', 'events'],
    ['EVENT_CANCELLED', 'events'],
    ['EVENT_BOARD', 'events'],
    ['GROUP_INVITATION', 'groups'],
    ['ONBOARDING_SERIES', 'other'],
    ['MONTHLY_RECOMMENDATION', 'other'],
  ] as const)('files %s under %s', (type, kind) => {
    expect(notificationTypesOf(kind)).toContain(type);
  });

  it('puts every type in exactly one kind', () => {
    const typesOfKinds = NOTIFICATION_KINDS.flatMap(notificationTypesOf);
    expect([...typesOfKinds].sort()).toEqual([...NOTIFICATION_TYPES].sort());
  });
});

describe('recipientsExcept', () => {
  it('tells everyone once and never the person who caused the event', () => {
    expect(
      recipientsExcept(['organizer', 'co-organizer', 'organizer'], 'applicant'),
    ).toEqual(['organizer', 'co-organizer']);
    expect(
      recipientsExcept(['organizer', 'co-organizer'], 'organizer'),
    ).toEqual(['co-organizer']);
  });

  it('keeps everyone when the system itself is the author', () => {
    expect(recipientsExcept(['u1', 'u2'], null)).toEqual(['u1', 'u2']);
  });
});

describe('eventChangesOf', () => {
  const before = (): EventWhenAndWhere => ({
    startAt: new Date('2030-01-01T18:00:00Z'),
    endAt: new Date('2030-01-01T20:00:00Z'),
    venueType: 'PUBLIC_VENUE',
    location: {
      street: 'Chabařovická 4',
      city: 'Praha 8',
      postalCode: '18200',
      country: 'Česko',
    },
  });

  it('sees nothing in an edit that keeps the time and the place', () => {
    expect(eventChangesOf(before(), before())).toEqual([]);
  });

  it.each([
    ['a later start', { startAt: new Date('2030-01-01T19:00:00Z') }],
    ['a later end', { endAt: new Date('2030-01-01T21:00:00Z') }],
  ])('reports %s as a change of time', (_, override) => {
    expect(eventChangesOf(before(), { ...before(), ...override })).toEqual([
      'TIME',
    ]);
  });

  it('reports a new address as a change of place', () => {
    expect(
      eventChangesOf(before(), {
        ...before(),
        location: { ...before().location!, street: 'Jiná 1' },
      }),
    ).toEqual(['PLACE']);
  });

  it('reports a change of the kind of venue as a change of place', () => {
    expect(
      eventChangesOf(before(), {
        ...before(),
        venueType: 'ONLINE',
        location: null,
      }),
    ).toEqual(['PLACE']);
  });

  it('reports both when both moved', () => {
    expect(
      eventChangesOf(before(), {
        ...before(),
        startAt: new Date('2030-01-02T18:00:00Z'),
        endAt: new Date('2030-01-02T20:00:00Z'),
        location: { ...before().location!, city: 'Brno' },
      }),
    ).toEqual(['TIME', 'PLACE']);
  });
});
