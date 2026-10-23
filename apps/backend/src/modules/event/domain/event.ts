import { Activity } from '@/modules/activity/domain/activity';

// Same limits as the CHECK constraints and column widths of `event`.
export const EVENT_TITLE_MIN_LENGTH = 3;
export const EVENT_TITLE_MAX_LENGTH = 80;
export const EVENT_DESCRIPTION_MAX_LENGTH = 2000;
export const EVENT_EQUIPMENT_MAX_LENGTH = 500;
export const EVENT_CONTRIBUTION_NOTE_MAX_LENGTH = 200;
// Decimal(10, 2)
export const EVENT_CONTRIBUTION_MAX_AMOUNT = 99_999_999.99;
export const EVENT_STREET_MAX_LENGTH = 200;
export const EVENT_CITY_MAX_LENGTH = 100;
export const EVENT_POSTAL_CODE_MAX_LENGTH = 20;
export const EVENT_COUNTRY_MAX_LENGTH = 100;
export const EVENT_PLACE_NAME_MAX_LENGTH = 200;
// A sanity cap, not a business rule: the roster is drawn seat by seat.
export const EVENT_PARTICIPANTS_LIMIT = 500;

export type EventStatus =
  'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'FINISHED' | 'NOT_HELD';
export type EventVisibility = 'PUBLIC' | 'GROUP_ONLY' | 'PRIVATE';
export type VenueType = 'PUBLIC_VENUE' | 'PRIVATE_VENUE' | 'ONLINE';

// F-05.1 creates events at a place. ONLINE waits for the PO's decision on
// ADR-0006 and is refused by the API until then.
export const CREATABLE_VENUE_TYPES = [
  'PUBLIC_VENUE',
  'PRIVATE_VENUE',
] as const satisfies readonly VenueType[];
export type CreatableVenueType = (typeof CREATABLE_VENUE_TYPES)[number];

// Model datatype `Location` (ADR-0001) without coordinates: F-05.1 takes a
// structured address, geocoding comes with the map service (F-12.3).
export type EventLocation = {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  placeName: string | null;
};

export type FillState = 'BELOW_MINIMUM' | 'MINIMUM_REACHED' | 'FULL';

// Derived attributes of the domain model (ADR-0009). Occupancy is the seats
// taken outside the app plus the approved participants.
export type Occupancy = {
  externalOccupiedSpots: number;
  approvedCount: number;
  occupiedSpots: number;
  missingToMinimum: number;
  freeSpots: number;
  fillState: FillState;
};

export const occupancyOf = (event: {
  minParticipants: number;
  maxParticipants: number;
  externalOccupiedSpots: number;
  approvedCount: number;
}): Occupancy => {
  const occupiedSpots = event.externalOccupiedSpots + event.approvedCount;
  const missingToMinimum = Math.max(0, event.minParticipants - occupiedSpots);
  const freeSpots = Math.max(0, event.maxParticipants - occupiedSpots);
  const fillState: FillState =
    missingToMinimum > 0
      ? 'BELOW_MINIMUM'
      : freeSpots > 0
        ? 'MINIMUM_REACHED'
        : 'FULL';
  return {
    externalOccupiedSpots: event.externalOccupiedSpots,
    approvedCount: event.approvedCount,
    occupiedSpots,
    missingToMinimum,
    freeSpots,
    fillState,
  };
};

export type Event = Occupancy & {
  id: string;
  title: string;
  description: string;
  equipment: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  venueType: VenueType;
  startAt: Date;
  endAt: Date;
  publishedAt: Date | null;
  createdAt: Date;
  minParticipants: number;
  maxParticipants: number;
  // Information only (F-05.1): what one pays, never a payment through the app.
  contributionAmount: number | null;
  contributionNote: string | null;
  location: EventLocation | null;
  activity: Activity;
  organizerId: string;
};

export type CreateEventData = {
  title: string;
  activityId: string;
  description: string;
  equipment?: string;
  venueType: CreatableVenueType;
  startAt: Date;
  endAt: Date;
  location: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    placeName?: string;
  };
  minParticipants: number;
  maxParticipants: number;
  externalOccupiedSpots: number;
  contributionAmount?: number;
  contributionNote?: string;
};

export type EventRuleViolation =
  | 'START_NOT_IN_FUTURE'
  | 'END_NOT_AFTER_START'
  | 'MIN_ABOVE_MAX'
  | 'OCCUPIED_ABOVE_MAX'
  | 'NOTE_WITHOUT_AMOUNT';

// Rules between fields that a single-field check cannot see. The form checks
// the same ones before sending; the server is the one that counts.
export const eventRuleViolations = (
  data: Pick<
    CreateEventData,
    | 'startAt'
    | 'endAt'
    | 'minParticipants'
    | 'maxParticipants'
    | 'externalOccupiedSpots'
    | 'contributionAmount'
    | 'contributionNote'
  >,
  now: Date,
): EventRuleViolation[] => {
  const violations: EventRuleViolation[] = [];
  if (data.startAt.getTime() <= now.getTime()) {
    violations.push('START_NOT_IN_FUTURE');
  }
  if (data.endAt.getTime() <= data.startAt.getTime()) {
    violations.push('END_NOT_AFTER_START');
  }
  if (data.minParticipants > data.maxParticipants) {
    violations.push('MIN_ABOVE_MAX');
  }
  if (data.externalOccupiedSpots > data.maxParticipants) {
    violations.push('OCCUPIED_ABOVE_MAX');
  }
  if (
    data.contributionNote !== undefined &&
    data.contributionAmount === undefined
  ) {
    violations.push('NOTE_WITHOUT_AMOUNT');
  }
  return violations;
};

// ---------------------------------------------------------------------------
// Public event list (F-02.3)
// ---------------------------------------------------------------------------

export const EVENT_LIST_DEFAULT_LIMIT = 20;
export const EVENT_LIST_MAX_LIMIT = 50;

export type Page = { limit: number; offset: number };

export const EVENT_LIST_MAX_ACTIVITY_FILTERS = 50;

export const EVENT_LIST_SEARCH_MAX_LENGTH = 100;
export const EVENT_LIST_LOCATION_MAX_LENGTH = 100;

// TODO(F-02.1b #91): `location` is plain text for now. A real place filter needs
// proper coordinates (geocoding, F-12.3): a point plus a radius, results sorted
// by distance, and similar spellings ("Brno" ~ "Brnoo") matched by similarity.
// What the public list can be narrowed by (F-02.1). Nothing set means all.
// `search` matches title, place, city, district and activity; `location` the
// place, city and district. Both ignore case and diacritics, and every word of
// a text has to match (in any of those fields).
export type EventListFilter = {
  activityIds: string[];
  search?: string;
  location?: string;
};

// The form a text is compared in: lower case, no diacritics, no outer spaces.
export const foldForSearch = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// What a row in the event list needs. The address is deliberately only
// approximate: street and coordinates never leave the server here, and the
// name of a private venue (someone's home) is dropped too.
export type EventListItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  startAt: Date;
  endAt: Date;
  venueType: VenueType;
  placeName: string | null;
  district: string | null;
  city: string | null;
  level: string | null;
  activity: Activity;
  // Needed for the event to happen; "missing" always counts towards this.
  minParticipants: number;
  maxParticipants: number;
  // Approved and attended people plus those the organizer brought along.
  takenCount: number;
};

export type EventListPage = { items: EventListItem[]; total: number };

// Statistics are hidden below this many included participants, so nobody can
// be picked out of them (F-06.7).
export const MIN_STATS_PARTICIPANTS = 3;

// A public detail also shows cancelled and over events, never drafts.
export type PublicEventStatus =
  'PUBLISHED' | 'CANCELLED' | 'FINISHED' | 'NOT_HELD';
export type ApprovalMode = 'MANUAL' | 'AUTOMATIC';
export type Gender = 'MALE' | 'FEMALE';

// Anonymized composition of the approved registered participants. People taken
// along from outside the app are not counted, hence `included` out of `total`;
// the gender split counts them as `unknown`, so it adds up to `total`.
export type ParticipantStats = {
  included: number;
  total: number;
  medianAge: number | null;
  gender: { male: number; female: number; unknown: number } | null;
};

export type EventDetail = EventListItem & {
  description: string;
  equipment: string | null;
  // Information only; nothing is paid in the app.
  contributionAmount: number | null;
  contributionNote: string | null;
  status: PublicEventStatus;
  approvalMode: ApprovalMode;
  organizerName: string;
  stats: ParticipantStats | null;
  // How many included people the stats need, so the UI can say when they appear.
  statsMinParticipants: number;
};
