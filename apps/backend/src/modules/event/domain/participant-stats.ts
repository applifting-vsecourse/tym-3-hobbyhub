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
 * Median age and gender split of the participants, or null when fewer than the
 * minimum of them gave both a birth date and a gender. Both figures appear
 * together and rest on the same people: showing them on different thresholds
 * would let the change between two views single someone out.
 */
export const computeParticipantStats = (
  participants: StatsParticipant[],
  eventStart: Date,
  total: number,
): ParticipantStats | null => {
  const complete = participants.flatMap(({ birthDate, gender }) =>
    birthDate && gender ? [{ birthDate, gender }] : [],
  );
  if (complete.length < MIN_STATS_PARTICIPANTS) return null;

  return {
    included: complete.length,
    total,
    medianAge: median(
      complete.map(({ birthDate }) => ageAt(birthDate, eventStart)),
    ),
    gender: {
      male: complete.filter(({ gender }) => gender === 'MALE').length,
      female: complete.filter(({ gender }) => gender === 'FEMALE').length,
    },
  };
};
