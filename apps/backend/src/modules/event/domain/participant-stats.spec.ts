import { Gender } from '@/modules/event/domain/event';
import {
  ageAt,
  computeParticipantStats,
  StatsParticipant,
} from './participant-stats';

const person = (
  birthDate: string | null,
  gender: Gender | null,
): StatsParticipant => ({
  birthDate: birthDate ? new Date(birthDate) : null,
  gender,
});
const EVENT_START = new Date('2026-10-22T17:00:00Z');

describe('ageAt', () => {
  it('counts full years up to the day of the event', () => {
    expect(ageAt(new Date('1990-10-22'), EVENT_START)).toBe(36);
    expect(ageAt(new Date('1990-10-23'), EVENT_START)).toBe(35);
  });
});

describe('computeParticipantStats', () => {
  it('stays hidden below three participants', () => {
    const stats = computeParticipantStats(
      [person('1990-01-01', 'MALE'), person('1991-01-01', 'FEMALE')],
      EVENT_START,
      4,
    );

    expect(stats).toBeNull();
  });

  it('gives the median age, the gender split and the coverage', () => {
    const stats = computeParticipantStats(
      [
        person('1996-01-01', 'MALE'),
        person('1986-01-01', 'FEMALE'),
        person('1976-01-01', 'MALE'),
      ],
      EVENT_START,
      5,
    );

    expect(stats).toEqual({
      included: 3,
      total: 5,
      medianAge: 40,
      gender: { male: 2, female: 1 },
    });
  });

  it('rounds the median of an even number of ages', () => {
    const stats = computeParticipantStats(
      [
        person('2000-01-01', 'MALE'),
        person('1996-01-01', 'MALE'),
        person('1990-01-01', 'MALE'),
        person('1985-01-01', 'MALE'),
      ],
      EVENT_START,
      4,
    );

    expect(stats?.medianAge).toBe(33);
  });

  it('leaves out a figure that too few people can support', () => {
    const stats = computeParticipantStats(
      [
        person('1990-01-01', null),
        person('1991-01-01', null),
        person(null, 'MALE'),
      ],
      EVENT_START,
      3,
    );

    expect(stats).toEqual({
      included: 3,
      total: 3,
      medianAge: null,
      gender: null,
    });
  });
});
