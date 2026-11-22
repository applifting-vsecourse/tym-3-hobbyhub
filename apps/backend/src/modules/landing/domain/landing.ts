// #215: the rows of the landing page. Plain TypeScript: no Nest, no Prisma,
// no HTTP.

import type {
  EventListItem,
  LandingCity,
  ViewerEventState,
} from '@/modules/event/domain/event';
import type { Group } from '@/modules/group/domain/group';
import type { RatingScore } from '@/modules/rating/domain/rating';

export const LANDING_EVENT_ROWS = [
  'lastMinute',
  'top',
  'liked',
  'friends',
  'near',
  'today',
  'weekend',
] as const;
export type LandingEventRow = (typeof LANDING_EVENT_ROWS)[number];

export const LANDING_GROUP_ROWS = ['groupsForYou', 'trendingGroups'] as const;
export type LandingGroupRow = (typeof LANDING_GROUP_ROWS)[number];

export type LandingRowKind = LandingEventRow | LandingGroupRow;
export const LANDING_ROW_KINDS: readonly LandingRowKind[] = [
  ...LANDING_EVENT_ROWS,
  ...LANDING_GROUP_ROWS,
];

export const isGroupRow = (kind: LandingRowKind): kind is LandingGroupRow =>
  (LANDING_GROUP_ROWS as readonly string[]).includes(kind);

/**
 * The rows in the order of the page. A visitor has no rows about themselves;
 * the page puts "Jak to funguje" after "Top akce" and the invitation to groups
 * after "Trendy skupiny" itself.
 */
export const LANDING_ROW_ORDER = {
  visitor: ['lastMinute', 'top', 'near', 'trendingGroups', 'today', 'weekend'],
  member: [
    'lastMinute',
    'top',
    'liked',
    'friends',
    'near',
    'groupsForYou',
    'trendingGroups',
    'today',
    'weekend',
  ],
} as const satisfies Record<string, readonly LandingRowKind[]>;

export const LANDING_EVENTS_PER_ROW = 5;
export const LANDING_GROUPS_PER_ROW = 6;
/** "Last minute": starts within this many hours. */
export const LAST_MINUTE_HOURS = 4;
/** "Trendy skupiny": members who joined within this many days. */
export const TRENDING_GROUPS_DAYS = 30;
/** How many cities the visitor may pick from for "near". */
export const LANDING_CITIES_LIMIT = 12;
export const LANDING_CITY_MAX_LENGTH = 100;

/** "Ve tvém okolí" may repeat an event another row shows. */
const REPEATABLE_ROWS: readonly LandingRowKind[] = ['near'];

export const perRowOf = (kind: LandingRowKind): number =>
  isGroupRow(kind) ? LANDING_GROUPS_PER_ROW : LANDING_EVENTS_PER_ROW;

/**
 * How many candidates a row asks for, so it is still full after the rows above
 * it took theirs: every earlier row of the same kind (events or groups) can
 * take at most its own share.
 */
export const candidateLimitOf = (
  order: readonly LandingRowKind[],
  kind: LandingRowKind,
): number => {
  if (REPEATABLE_ROWS.includes(kind)) return perRowOf(kind);
  const above = order
    .slice(0, order.indexOf(kind))
    .filter(
      (other) =>
        !REPEATABLE_ROWS.includes(other) &&
        isGroupRow(other) === isGroupRow(kind),
    );
  return perRowOf(kind) * (above.length + 1);
};

/** What a row's query found, in its order; `null` when the query failed. */
export type RowCandidates = ReadonlyMap<LandingRowKind, string[] | null>;

export type PickedRow =
  | { kind: LandingRowKind; status: 'ok'; ids: string[] }
  | { kind: LandingRowKind; status: 'error' };

/**
 * The rows as the page shows them, in order. An event or a group is only in
 * the first row from the top it fits, except "near", which neither skips nor
 * takes anything. A row left empty is not on the page; a failed row is, so
 * the page can offer to try it again.
 */
export const pickRows = (
  order: readonly LandingRowKind[],
  candidates: RowCandidates,
): PickedRow[] => {
  const taken = new Set<string>();
  return order.flatMap((kind): PickedRow[] => {
    if (!candidates.has(kind)) return [];
    const ids = candidates.get(kind);
    if (!ids) return [{ kind, status: 'error' }];
    const isRepeatable = REPEATABLE_ROWS.includes(kind);
    const picked = ids
      .filter((id) => isRepeatable || !taken.has(id))
      .slice(0, perRowOf(kind));
    if (!isRepeatable) picked.forEach((id) => taken.add(id));
    return picked.length > 0 ? [{ kind, status: 'ok', ids: picked }] : [];
  });
};

/** Same zone as the event list's days (`EVENT_LIST_TIME_ZONE`). */
const LANDING_TIME_ZONE = 'Europe/Prague';

const pad = (value: number): string => String(value).padStart(2, '0');

/** The calendar day in Prague at the instant, YYYY-MM-DD. */
export const pragueDayOf = (now: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: LANDING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

const addDays = (day: string, days: number): string => {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
};

export type DayRange = { dateFrom: string; dateTo: string };

/** "Dnes": today in Prague. */
export const todayOf = (now: Date): DayRange => {
  const today = pragueDayOf(now);
  return { dateFrom: today, dateTo: today };
};

/**
 * "Tento víkend": the nearest Saturday and Sunday; on a Saturday that weekend,
 * on a Sunday only that Sunday. The same days as the event list's weekend.
 */
export const weekendOf = (now: Date): DayRange => {
  const today = pragueDayOf(now);
  const [year, month, date] = today.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  if (weekday === 0) return { dateFrom: today, dateTo: today };
  const saturday = addDays(today, 6 - weekday);
  return { dateFrom: saturday, dateTo: addDays(saturday, 1) };
};

/** "Last minute": the latest start that still counts. */
export const lastMinuteUntil = (now: Date): Date =>
  new Date(now.getTime() + LAST_MINUTE_HOURS * 60 * 60 * 1000);

/** "Trendy skupiny": members who joined since this instant count. */
export const trendingSince = (now: Date): Date =>
  new Date(now.getTime() - TRENDING_GROUPS_DAYS * 24 * 60 * 60 * 1000);

/** A friend who allowed friends to see their upcoming events (ADR-0026). */
export type LandingFriend = { id: string; name: string; image: string | null };

export type LandingEvent = EventListItem & {
  /** What the viewer already is on the event; null for a visitor. */
  viewerState: ViewerEventState | null;
  /** The viewer's friends going who allowed it; nobody else is counted. */
  friends: LandingFriend[];
  /**
   * The organizer's public score, on "Top akce" for a signed-in viewer only:
   * a visitor does not see people's scores (visibility matrix).
   */
  organizerScore: RatingScore | null;
};

/** A group of a landing row; `recentMemberCount` on "Trendy skupiny" only. */
export type LandingGroup = Group & { recentMemberCount: number | null };

export type LandingRow = {
  kind: LandingRowKind;
  status: 'ok' | 'error';
  events: LandingEvent[];
  groups: LandingGroup[];
};

/**
 * How "Ve tvém okolí" was picked: around the home within the travel radius,
 * or in a city (the visitor's pick, or the home city without a radius). The
 * home goes back to its owner only, for the link to the event list.
 */
export type LandingNear =
  | {
      mode: 'radius';
      radiusKm: number;
      city: string;
      latitude: number;
      longitude: number;
    }
  | { mode: 'city'; city: string };

export type Landing = {
  rows: LandingRow[];
  near: LandingNear | null;
  /** The cities to pick from when "near" goes by city; empty otherwise. */
  cities: LandingCity[];
  /** The viewer's own profile activities, for the link of their row. */
  interestActivityIds: string[];
};
