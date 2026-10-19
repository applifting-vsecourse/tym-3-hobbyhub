import {
  Gender,
  MIN_STATS_PARTICIPANTS,
  ParticipantStats,
} from '@/modules/event/domain/event';

export type StatsParticipant = {
  birthDate: Date | null;
  gender: Gender | null;
};

const EVENT_TIME_ZONE = 'Europe/Prague';

// Calendar day of the event where it takes place, not in UTC: an event at
// 00:30 Prague time still starts on the previous day in UTC.
const localDay = (at: Date): { year: number; month: number; day: number } => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(at)
    .split('-')
    .map(Number);
  return { year, month: month - 1, day };
};

// Full years between the birth date and the day of the event.
export const ageAt = (birthDate: Date, at: Date): number => {
  const event = localDay(at);
  let age = event.year - birthDate.getUTCFullYear();
  const hadBirthday =
    event.month > birthDate.getUTCMonth() ||
    (event.month === birthDate.getUTCMonth() &&
      event.day >= birthDate.getUTCDate());
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
