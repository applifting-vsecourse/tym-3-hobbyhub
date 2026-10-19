import {
  Gender,
  MIN_STATS_PARTICIPANTS,
  ParticipantStats,
} from '@/modules/event/domain/event';

export type StatsParticipant = {
  birthDate: Date | null;
  gender: Gender | null;
};

// Full years between the birth date and the day of the event.
export const ageAt = (birthDate: Date, at: Date): number => {
  let age = at.getUTCFullYear() - birthDate.getUTCFullYear();
  const hadBirthday =
    at.getUTCMonth() > birthDate.getUTCMonth() ||
    (at.getUTCMonth() === birthDate.getUTCMonth() &&
      at.getUTCDate() >= birthDate.getUTCDate());
  if (!hadBirthday) age -= 1;
  return age;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

/**
 * Median age and gender split of the participants, or null when too few of
 * them are included to keep individuals anonymous. A figure that rests on
 * fewer than the minimum people (missing birth date or gender) is left out.
 */
export const computeParticipantStats = (
  participants: StatsParticipant[],
  eventStart: Date,
  total: number,
): ParticipantStats | null => {
  if (participants.length < MIN_STATS_PARTICIPANTS) return null;

  const ages = participants.flatMap(({ birthDate }) =>
    birthDate ? [ageAt(birthDate, eventStart)] : [],
  );
  const male = participants.filter(({ gender }) => gender === 'MALE').length;
  const female = participants.filter(
    ({ gender }) => gender === 'FEMALE',
  ).length;

  return {
    included: participants.length,
    total,
    medianAge: ages.length >= MIN_STATS_PARTICIPANTS ? median(ages) : null,
    gender: male + female >= MIN_STATS_PARTICIPANTS ? { male, female } : null,
  };
};
