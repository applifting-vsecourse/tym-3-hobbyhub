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
