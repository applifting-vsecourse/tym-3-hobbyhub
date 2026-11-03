import { interestViolations, isProfileSetUp, stepNumber } from './onboarding';

describe('interestViolations', () => {
  it('accepts one or more different activities', () => {
    expect(
      interestViolations([
        { activityId: 'a', levelId: 'l1' },
        { activityId: 'b', levelId: 'l2' },
      ]),
    ).toEqual([]);
  });

  it('asks for at least one activity', () => {
    expect(interestViolations([])).toEqual(['NO_ACTIVITY']);
  });

  it('refuses the same activity twice', () => {
    expect(
      interestViolations([
        { activityId: 'a', levelId: 'l1' },
        { activityId: 'a', levelId: 'l2' },
      ]),
    ).toEqual(['DUPLICATE_ACTIVITY']);
  });
});

describe('isProfileSetUp', () => {
  const interest = {
    activity: {
      id: 'a1',
      name: 'Florbal',
      icon: 'florbal',
      defaultMinParticipants: 8,
      defaultMaxParticipants: 12,
    },
    level: null,
  };

  const address = {
    street: 'Sokolovská 12',
    city: 'Praha 8',
    postalCode: '186 00',
    country: 'Česko',
    latitude: 50.0942,
    longitude: 14.4421,
  };

  it('needs activities and a home address', () => {
    expect(isProfileSetUp({ interests: [interest], address })).toBe(true);
    expect(isProfileSetUp({ interests: [], address })).toBe(false);
    expect(isProfileSetUp({ interests: [interest], address: null })).toBe(
      false,
    );
  });
});

describe('stepNumber', () => {
  it('numbers steps from 1', () => {
    expect(stepNumber('ACTIVITIES')).toBe(1);
    expect(stepNumber('PROFILE')).toBe(3);
  });
});
