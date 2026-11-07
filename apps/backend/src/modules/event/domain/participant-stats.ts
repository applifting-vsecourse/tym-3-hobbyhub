import {
  Gender,
  MIN_STATS_PARTICIPANTS,
  ParticipantStats,
} from '@/modules/event/domain/event';
import { ageInYear, yearIn } from '@/shared/auth/registration/registration';

export type StatsParticipant = {
  birthYear: number | null;
  gender: Gender | null;
};

/**
 * Age at the event with the precision of a year: the year of the event (in
 * Prague, where it takes place, so an event at 00:30 on New Year's Day counts
 * in the new year) minus the year of birth. Only the year of birth is known
 * (#174, ADR-0016), so someone whose birthday comes later in that year counts
 * a year older than they are.
 */
export const ageAt = (birthYear: number, at: Date): number =>
  ageInYear(birthYear, yearIn(at));

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

/**
 * Median age and gender split of the participants, or null when fewer than the
 * minimum of them gave both a year of birth and a gender. The median rests on
 * ages with the precision of a year (see `ageAt`). Both figures appear
 * together and rest on the same people: showing them on different thresholds
 * would let the change between two views single someone out. Everyone else
 * among the taken seats counts as unknown, so the split adds up to the seats.
 */
export const computeParticipantStats = (
  participants: StatsParticipant[],
  eventStart: Date,
  total: number,
): ParticipantStats | null => {
  const complete = participants.flatMap(({ birthYear, gender }) =>
    birthYear !== null && gender ? [{ birthYear, gender }] : [],
  );
  if (complete.length < MIN_STATS_PARTICIPANTS) return null;

  return {
    included: complete.length,
    total,
    medianAge: median(
      complete.map(({ birthYear }) => ageAt(birthYear, eventStart)),
    ),
    gender: {
      male: complete.filter(({ gender }) => gender === 'MALE').length,
      female: complete.filter(({ gender }) => gender === 'FEMALE').length,
      unknown: total - complete.length,
    },
  };
};
