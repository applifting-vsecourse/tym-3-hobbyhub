import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EventStatus,
  ParticipationStatus,
  Prisma,
  Activity as PrismaActivity,
  Event as PrismaEvent,
  Level as PrismaLevel,
} from '@/generated/prisma/client';
import {
  CreateEventData,
  Event,
  EventListFilter,
  EventListItem,
  EventListPage,
  EventLocation,
  foldForSearch,
  occupancyOf,
  Page,
} from '@/modules/event/domain/event';
import { Injectable } from '@nestjs/common';

// Approved participations are the only ones that take a seat (ADR-0009).
const include = {
  activity: true,
  _count: {
    select: {
      participations: { where: { status: ParticipationStatus.APPROVED } },
    },
  },
} as const;

type PrismaEventWithRelations = PrismaEvent & {
  activity: PrismaActivity;
  _count: { participations: number };
};

// The list also needs the level and counts the people who actually take a seat
// (approved, or already attended an event that is over).
const LIST_TAKEN_STATUSES: ParticipationStatus[] = [
  ParticipationStatus.APPROVED,
  ParticipationStatus.ATTENDED,
];

// TODO(F-02.1b #91): this is an exact "contains" match, so "Brno" misses a
// typo like "Brnoo" and knows nothing about places near Brno. Similarity search
// (e.g. pg_trgm `similarity`, ranked by closeness) belongs here, and so does
// the distance from a chosen point once events have coordinates: geocode the
// address on save (F-12.3), then filter and sort by radius, e.g. with PostGIS.
// The columns `locationLatitude` and `locationLongitude` exist but are empty.
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

const listInclude = {
  activity: true,
  level: true,
  _count: {
    select: {
      participations: { where: { status: { in: LIST_TAKEN_STATUSES } } },
    },
  },
};

export const mapPrismaEventToListItem = (
  event: PrismaEvent & {
    activity: PrismaActivity;
    level: PrismaLevel | null;
    _count: { participations: number };
  },
): EventListItem => ({
  id: event.id,
  title: event.title,
  imageUrl: event.imageUrl,
  startAt: event.startAt,
  endAt: event.endAt,
  venueType: event.venueType,
  placeName:
    event.venueType === 'PUBLIC_VENUE' ? event.locationPlaceName : null,
  district: event.locationDistrict,
  city: event.locationCity,
  level: event.level?.name ?? null,
  activity: {
    id: event.activity.id,
    name: event.activity.name,
    icon: event.activity.icon,
    defaultMinParticipants: event.activity.defaultMinParticipants,
    defaultMaxParticipants: event.activity.defaultMaxParticipants,
  },
  minParticipants: event.minParticipants,
  maxParticipants: event.maxParticipants,
  takenCount: event._count.participations + event.externalOccupiedSpots,
});

// The address is all-or-nothing (CHECK in the migration), so one column
// decides whether there is one.
const mapLocation = (event: PrismaEvent): EventLocation | null =>
  event.locationStreet !== null &&
  event.locationCity !== null &&
  event.locationPostalCode !== null &&
  event.locationCountry !== null
    ? {
        street: event.locationStreet,
        city: event.locationCity,
        postalCode: event.locationPostalCode,
        country: event.locationCountry,
        placeName: event.locationPlaceName,
      }
    : null;

const mapPrismaEventToDomain = (event: PrismaEventWithRelations): Event => ({
  id: event.id,
  title: event.title,
  description: event.description,
  equipment: event.equipment,
  status: event.status,
  visibility: event.visibility,
  venueType: event.venueType,
  startAt: event.startAt,
  endAt: event.endAt,
  publishedAt: event.publishedAt,
  createdAt: event.createdAt,
  minParticipants: event.minParticipants,
  maxParticipants: event.maxParticipants,
  contributionAmount: event.contributionAmount?.toNumber() ?? null,
  contributionNote: event.contributionNote,
  location: mapLocation(event),
  activity: {
    id: event.activity.id,
    name: event.activity.name,
    icon: event.activity.icon,
    defaultMinParticipants: event.activity.defaultMinParticipants,
    defaultMaxParticipants: event.activity.defaultMaxParticipants,
  },
  organizerId: event.organizerId,
  ...occupancyOf({
    minParticipants: event.minParticipants,
    maxParticipants: event.maxParticipants,
    externalOccupiedSpots: event.externalOccupiedSpots,
    approvedCount: event._count.participations,
  }),
});

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  // F-05.1 has no drafts: an event is created published, in one write.
  async createPublishedEvent(
    data: CreateEventData & { organizerId: string; publishedAt: Date },
  ): Promise<Event> {
    const event = await this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        equipment: data.equipment ?? null,
        status: EventStatus.PUBLISHED,
        publishedAt: data.publishedAt,
        venueType: data.venueType,
        startAt: data.startAt,
        endAt: data.endAt,
        minParticipants: data.minParticipants,
        maxParticipants: data.maxParticipants,
        externalOccupiedSpots: data.externalOccupiedSpots,
        contributionAmount: data.contributionAmount ?? null,
        contributionNote: data.contributionNote ?? null,
        locationStreet: data.location.street,
        locationCity: data.location.city,
        locationPostalCode: data.location.postalCode,
        locationCountry: data.location.country,
        locationPlaceName: data.location.placeName ?? null,
        activity: { connect: { id: data.activityId } },
        organizer: { connect: { id: data.organizerId } },
      },
      include,
    });
    return mapPrismaEventToDomain(event);
  }

  async getEventById(id: string): Promise<Event | null> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include,
    });
    return event ? mapPrismaEventToDomain(event) : null;
  }

  // The same set the map shows: public, published, not hidden by a moderator
  // and not over yet. Soonest first. Several activities match any of them.
  async getUpcomingPublicEvents(
    now: Date,
    { limit, offset }: Page,
    filter: EventListFilter = { activityIds: [] },
  ): Promise<EventListPage> {
    const { activityIds } = filter;
    const textMatches = await this.findIdsMatchingText(filter, now);
    const where = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      isHidden: false,
      endAt: { gt: now },
      ...(activityIds.length > 0 && { activityId: { in: activityIds } }),
      ...(textMatches && { id: { in: textMatches } }),
    } as const;
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
        include: listInclude,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { items: events.map(mapPrismaEventToListItem), total };
  }

  // Text conditions need the folding above, which Prisma cannot express, so the
  // matching ids come from SQL and the rest of the filter stays in Prisma. The
  // SQL repeats the conditions of the public list, so it never returns the ids
  // of drafts, private or finished events. Null means there is no text to match.
  private async findIdsMatchingText(
    { search, location }: EventListFilter,
    now: Date,
  ): Promise<string[] | null> {
    // Every word has to match somewhere, so "volejbal praha" finds the activity
    // in one column and the city in another.
    const words = (text?: string): string[] =>
      foldForSearch(text ?? '')
        .split(/\s+/)
        .filter(Boolean);
    const conditions = [
      ...words(search).map((word) =>
        containsInAny(
          [Prisma.sql`e."title"`, ...PLACE_COLUMNS, Prisma.sql`a."name"`],
          word,
        ),
      ),
      ...words(location).map((word) => containsInAny(PLACE_COLUMNS, word)),
    ];
    if (conditions.length === 0) return null;

    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT e."id" FROM "event" e
      JOIN "activity" a ON a."id" = e."activityId"
      WHERE e."status" = 'PUBLISHED' AND e."visibility" = 'PUBLIC'
        AND NOT e."isHidden" AND e."endAt" > ${now}
        AND ${Prisma.join(
          conditions.map((condition) => Prisma.sql`(${condition})`),
          ' AND ',
        )}`;
    return rows.map((row) => row.id);
  }
}
