import { Activity } from '@/modules/activity/domain/activity';

export const EVENT_LIST_DEFAULT_LIMIT = 20;
export const EVENT_LIST_MAX_LIMIT = 50;

export type Page = { limit: number; offset: number };

export type EventListPage = { items: EventListItem[]; total: number };

export type VenueType = 'PUBLIC_VENUE' | 'PRIVATE_VENUE' | 'ONLINE';

// What a card in the event list needs. The address is deliberately only
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

// Statistics are hidden below this many included participants, so nobody can
// be picked out of them (F-06.7).
export const MIN_STATS_PARTICIPANTS = 3;

export type EventStatus = 'PUBLISHED' | 'CANCELLED' | 'FINISHED' | 'NOT_HELD';
export type ApprovalMode = 'MANUAL' | 'AUTOMATIC';
export type Gender = 'MALE' | 'FEMALE';

// Anonymized composition of the approved registered participants. People taken
// along from outside the app are not counted, hence `included` out of `total`.
export type ParticipantStats = {
  included: number;
  total: number;
  medianAge: number | null;
  gender: { male: number; female: number } | null;
};

export type EventDetail = EventListItem & {
  description: string;
  equipment: string | null;
  // Information only; nothing is paid in the app.
  contributionAmount: number | null;
  status: EventStatus;
  approvalMode: ApprovalMode;
  organizerName: string;
  stats: ParticipantStats | null;
  // How many included people the stats need, so the UI can say when they appear.
  statsMinParticipants: number;
};
