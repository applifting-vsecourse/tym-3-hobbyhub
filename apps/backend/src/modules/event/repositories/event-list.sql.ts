import { Prisma } from '@/generated/prisma/client';
import {
  EVENT_LIST_TIME_ZONE,
  EventFilter,
  foldForSearch,
} from '@/modules/event/domain/event';

// The filter of an event listing (`EventFilter`) as SQL, written once for every
// list that offers it: the public list and a person's own overview (F-06.3,
// #177). The text conditions need folding that Prisma cannot express, so the
// callers pick ids with `$queryRaw` and load the rows with Prisma.
//
// The conditions read the event with the alias `e` and its activity with `a`:
//   FROM "event" e JOIN "activity" a ON a."id" = e."activityId"

// TODO(F-02.1b #91): this is an exact "contains" match, so "Brno" misses a
// typo like "Brnoo". Similarity search (e.g. pg_trgm `similarity`, ranked by
// closeness) belongs here, and so does a radius filter once every event has
// coordinates (geocoding on save, F-12.3).
// The database folds like `foldForSearch` does, but only for the diacritics of
// Czech and Slovak (no `unaccent` extension needed); other accents, such as
// "è", are not matched.
const FOLD_FROM = 'áäčďéěíĺľňóôöŕřšťúůüýž';
const FOLD_TO = 'aacdeeillnooorrstuuuyz';

// True when `needle` is part of any of the columns, ignoring case and diacritics.
const containsInAny = (columns: Prisma.Sql[], needle: string): Prisma.Sql =>
  Prisma.join(
    columns.map(
      (column) =>
        Prisma.sql`strpos(translate(lower(coalesce(${column}, '')), ${FOLD_FROM}, ${FOLD_TO}), ${needle}) > 0`,
    ),
    ' OR ',
  );

// A private venue is someone's home: its name is never matched, like it is
// never shown.
const PLACE_COLUMNS = [
  Prisma.sql`CASE WHEN e."venueType" = 'PUBLIC_VENUE' THEN e."locationPlaceName" END`,
  Prisma.sql`e."locationCity"`,
  Prisma.sql`e."locationDistrict"`,
];

const words = (text?: string): string[] =>
  foldForSearch(text ?? '')
    .split(/\s+/)
    .filter(Boolean);

// Every word of a text has to match somewhere, so "volejbal praha" finds the
// activity in one column and the city in another. Nothing set is no condition.
export const eventFilterConditions = ({
  activityIds,
  search,
  location,
  dateFrom,
  dateTo,
}: EventFilter): Prisma.Sql[] => [
  ...(activityIds.length > 0
    ? [Prisma.sql`e."activityId" IN (${Prisma.join(activityIds)})`]
    : []),
  // "startAt" is a UTC timestamp without a zone: the days are turned into UTC
  // instants (midnight in Prague) so the index on it stays usable.
  ...(dateFrom
    ? [
        Prisma.sql`e."startAt" >= (${dateFrom}::date::timestamp AT TIME ZONE ${EVENT_LIST_TIME_ZONE}) AT TIME ZONE 'UTC'`,
      ]
    : []),
  ...(dateTo
    ? [
        Prisma.sql`e."startAt" < ((${dateTo}::date + 1)::timestamp AT TIME ZONE ${EVENT_LIST_TIME_ZONE}) AT TIME ZONE 'UTC'`,
      ]
    : []),
  ...words(search).map(
    (word) =>
      Prisma.sql`(${containsInAny(
        [Prisma.sql`e."title"`, ...PLACE_COLUMNS, Prisma.sql`a."name"`],
        word,
      )})`,
  ),
  ...words(location).map(
    (word) => Prisma.sql`(${containsInAny(PLACE_COLUMNS, word)})`,
  ),
];

// The conditions joined with AND; `TRUE` keeps an empty list valid SQL.
export const allOf = (conditions: Prisma.Sql[]): Prisma.Sql =>
  conditions.length > 0 ? Prisma.join(conditions, ' AND ') : Prisma.sql`TRUE`;

// The order of a person's own lists (#177): what is still ahead first, soonest
// first, then everything else, latest first. `isAhead` is a condition on the
// row; offset paging stays stable because the database does all the sorting.
export const aheadFirstOrder = (isAhead: Prisma.Sql): Prisma.Sql =>
  Prisma.sql`CASE WHEN ${isAhead} THEN 0 ELSE 1 END ASC,
    CASE WHEN ${isAhead} THEN e."startAt" END ASC,
    e."startAt" DESC,
    e."id" ASC`;
