import { Gender } from '@/modules/event/domain/event';
import {
  ageAt,
  computeParticipantStats,
  StatsParticipant,
} from './participant-stats';

const person = (
  birthYear: number | null,
  gender: Gender | null,
): StatsParticipant => ({ birthYear, gender });
const EVENT_START = new Date('2026-10-22T17:00:00Z');

describe('ageAt', () => {
  it('is the year of the event minus the year of birth, birthday or not', () => {
    // Born in October or in December 1990: only the year is known, so both
    // count as 36 at an event on 22 October 2026.
    expect(ageAt(1990, EVENT_START)).toBe(36);
  });

  it('uses the Prague year, even when UTC is still in the year before', () => {
    // 00:30 on 1 January in Prague is 23:30 on 31 December in UTC.
    const start = new Date('2026-12-31T23:30:00Z');
    expect(ageAt(1990, start)).toBe(37);
  });
});

describe('computeParticipantStats', () => {
  it('stays hidden below three participants', () => {
    const stats = computeParticipantStats(
      [person(1990, 'MALE'), person(1991, 'FEMALE')],
      EVENT_START,
      4,
    );

    expect(stats).toBeNull();
  });

  it('gives the median age, the gender split and the coverage', () => {
    const stats = computeParticipantStats(
      [person(1996, 'MALE'), person(1986, 'FEMALE'), person(1976, 'MALE')],
      EVENT_START,
      5,
    );

    expect(stats).toEqual({
      included: 3,
      total: 5,
      medianAge: 40,
      gender: { male: 2, female: 1, unknown: 2 },
    });
  });

  it('counts people taken along from outside the app as unknown gender', () => {
    const stats = computeParticipantStats(
      [
        person(1990, 'MALE'),
        person(1985, 'MALE'),
        person(1980, 'MALE'),
        person(1995, 'MALE'),
        person(1988, 'MALE'),
      ],
      EVENT_START,
      7,
    );

    expect(stats?.gender).toEqual({ male: 5, female: 0, unknown: 2 });
  });

  it('rounds the median of an even number of ages', () => {
    const stats = computeParticipantStats(
      [
        person(2000, 'MALE'),
        person(1996, 'MALE'),
        person(1990, 'MALE'),
        person(1985, 'MALE'),
      ],
      EVENT_START,
      4,
    );

    expect(stats?.medianAge).toBe(33);
  });

  it('counts only people who gave both a birth year and a gender', () => {
    const stats = computeParticipantStats(
      [
        person(1990, null),
        person(1991, 'FEMALE'),
        person(null, 'MALE'),
        person(1985, 'MALE'),
      ],
      EVENT_START,
      4,
    );

    expect(stats).toBeNull();
  });

  it('shows age and gender together, resting on the same people', () => {
    const stats = computeParticipantStats(
      [
        person(1990, 'MALE'),
        person(1991, 'FEMALE'),
        person(null, 'MALE'),
        person(1985, 'MALE'),
      ],
      EVENT_START,
      6,
    );

    expect(stats).toMatchObject({
      included: 3,
      total: 6,
      gender: { male: 2, female: 1, unknown: 3 },
    });
    expect(stats?.medianAge).toBe(36);
  });
});
