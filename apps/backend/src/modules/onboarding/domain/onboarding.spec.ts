import { interestViolations, isProfileSetUp, stepNumber } from './onboarding';

describe('interestViolations', () => {
  it('accepts one or more different activities', () => {
    expect(
      interestViolations([
        { activityId: 'a', level: 'BEGINNER' },
        { activityId: 'b', level: 'EXPERT' },
      ]),
    ).toEqual([]);
  });

  it('asks for at least one activity', () => {
    expect(interestViolations([])).toEqual(['NO_ACTIVITY']);
  });

  it('refuses the same activity twice', () => {
    expect(
      interestViolations([
        { activityId: 'a', level: 'BEGINNER' },
        { activityId: 'a', level: 'EXPERT' },
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

  it('needs activities and a location', () => {
    expect(isProfileSetUp({ interests: [interest], city: 'Praha 8' })).toBe(
      true,
    );
    expect(isProfileSetUp({ interests: [], city: 'Praha 8' })).toBe(false);
    expect(isProfileSetUp({ interests: [interest], city: null })).toBe(false);
  });
});

describe('stepNumber', () => {
  it('numbers steps from 1', () => {
    expect(stepNumber('ACTIVITIES')).toBe(1);
    expect(stepNumber('PROFILE')).toBe(3);
  });
});
