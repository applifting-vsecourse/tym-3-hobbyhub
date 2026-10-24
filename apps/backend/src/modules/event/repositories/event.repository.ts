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
  CancelEventData,
  CreateEventData,
  Event,
  EventChangeResult,
  EventDetail,
  EventListFilter,
  EventListItem,
  EventListPage,
  EventLocation,
  foldForSearch,
  MIN_STATS_PARTICIPANTS,
  occupancyOf,
  Page,
  UpdateEventData,
} from '@/modules/event/domain/event';
import { computeParticipantStats } from '@/modules/event/domain/participant-stats';
import { Injectable } from '@nestjs/common';

// Approved participations are the only ones that take a seat (ADR-0009).
const include = {
  activity: true,
  cancellationReason: true,
  _count: {
    select: {
      participations: { where: { status: ParticipationStatus.APPROVED } },
    },
  },
} as const;

type PrismaEventWithRelations = PrismaEvent & {
  activity: PrismaActivity;
  cancellationReason: { name: string } | null;
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

// The condition of the public event list, with the alias `e` for the event and
// `a` for its activity. Every word of a text has to match somewhere, so
// "volejbal praha" finds the activity in one column and the city in another.
const listCondition = (
  now: Date,
  { activityIds, search, location }: EventListFilter,
): Prisma.Sql => {
  const words = (text?: string): string[] =>
    foldForSearch(text ?? '')
      .split(/\s+/)
      .filter(Boolean);
  const conditions = [
    Prisma.sql`e."status" = 'PUBLISHED'`,
    Prisma.sql`e."visibility" = 'PUBLIC'`,
    Prisma.sql`NOT e."isHidden"`,
    Prisma.sql`e."endAt" > ${now}`,
    ...(activityIds.length > 0
      ? [Prisma.sql`e."activityId" IN (${Prisma.join(activityIds)})`]
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
  return Prisma.join(conditions, ' AND ');
};

// Visibility shared by the list and the detail: public and not hidden by a
// moderator. Drafts never show; the detail also keeps over and cancelled events.
const PUBLIC_EVENT = {
  status: { not: 'DRAFT' },
  visibility: 'PUBLIC',
  isHidden: false,
} as const;

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
  cancellationReason: event.cancellationReason?.name ?? null,
  cancellationNote: event.cancellationNote,
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

  // The service checked the rules on a copy it read earlier, so the write
  // repeats them: it only matches an event that is still editable, and the
  // seats taken are counted in the same transaction. The location is
  // all-or-nothing and is sent whole (none for an online event); optional
  // texts the client left out are cleared.
  async updateEvent(
    id: string,
    data: UpdateEventData,
    now: Date,
  ): Promise<EventChangeResult> {
    return this.prisma.$transaction(async (tx) => {
      const approved = await tx.participation.count({
        where: { eventId: id, status: ParticipationStatus.APPROVED },
      });
      if (data.maxParticipants < data.externalOccupiedSpots + approved) {
        return { ok: false, violation: 'MAX_BELOW_OCCUPIED' } as const;
      }
      const { count } = await tx.event.updateMany({
        where: {
          id,
          status: { in: [EventStatus.DRAFT, EventStatus.PUBLISHED] },
          startAt: { gt: now },
        },
        data: {
          title: data.title,
          description: data.description,
          equipment: data.equipment ?? null,
          venueType: data.venueType,
          startAt: data.startAt,
          endAt: data.endAt,
          minParticipants: data.minParticipants,
          maxParticipants: data.maxParticipants,
          externalOccupiedSpots: data.externalOccupiedSpots,
          contributionAmount: data.contributionAmount ?? null,
          contributionNote: data.contributionNote ?? null,
          locationStreet: data.location?.street ?? null,
          locationCity: data.location?.city ?? null,
          locationPostalCode: data.location?.postalCode ?? null,
          locationCountry: data.location?.country ?? null,
          locationPlaceName: data.location?.placeName ?? null,
          activityId: data.activityId,
        },
      });
      if (count === 0) {
        return { ok: false, violation: 'EVENT_NOT_CHANGEABLE' } as const;
      }
      const event = await tx.event.findUniqueOrThrow({
        where: { id },
        include,
      });
      return { ok: true, event: mapPrismaEventToDomain(event) } as const;
    });
  }

  // Matches only a published event that has not started, so two cancels in a
  // row cannot overwrite the first reason.
  async cancelEvent(
    id: string,
    data: CancelEventData,
    now: Date,
  ): Promise<EventChangeResult> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.event.updateMany({
        where: { id, status: EventStatus.PUBLISHED, startAt: { gt: now } },
        data: {
          status: EventStatus.CANCELLED,
          cancelledAt: now,
          cancellationNote: data.cancellationNote ?? null,
          cancellationReasonId: data.cancellationReasonId,
        },
      });
      if (count === 0) {
        return { ok: false, violation: 'EVENT_NOT_CANCELLABLE' } as const;
      }
      const event = await tx.event.findUniqueOrThrow({
        where: { id },
        include,
      });
      return { ok: true, event: mapPrismaEventToDomain(event) } as const;
    });
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
  //
  // The text conditions need the folding above, which Prisma cannot express, so
  // the whole filter is one SQL condition: it picks the ids of the page and
  // counts the total, and Prisma only loads those few events with their
  // relations. The rule of what is public is written once, here.
  async getUpcomingPublicEvents(
    now: Date,
    { limit, offset }: Page,
    filter: EventListFilter = { activityIds: [] },
  ): Promise<EventListPage> {
    const where = listCondition(now, filter);
    const [pageRows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT e."id" FROM "event" e
        JOIN "activity" a ON a."id" = e."activityId"
        WHERE ${where}
        ORDER BY e."startAt" ASC, e."id" ASC
        LIMIT ${limit} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS "total" FROM "event" e
        JOIN "activity" a ON a."id" = e."activityId"
        WHERE ${where}`,
    ]);
    const ids = pageRows.map((row) => row.id);
    const events = await this.prisma.event.findMany({
      where: { id: { in: ids } },
      include: listInclude,
    });
    const byId = new Map(events.map((event) => [event.id, event]));
    return {
      items: ids.flatMap((id) => {
        const event = byId.get(id);
        return event ? [mapPrismaEventToListItem(event)] : [];
      }),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  // Public detail: the list's visibility rules, but an event that was cancelled
  // or is over stays reachable, so a shared link still explains what happened.
  async getPublicEventById(id: string): Promise<EventDetail | null> {
    const event = await this.prisma.event.findFirst({
      where: { id, ...PUBLIC_EVENT },
      include: {
        activity: true,
        level: true,
        cancellationReason: true,
        organizer: { select: { id: true, name: true } },
        participations: {
          where: { status: { in: LIST_TAKEN_STATUSES } },
          select: { user: { select: { birthDate: true, gender: true } } },
        },
      },
    });
    if (!event) return null;

    const participants = event.participations.map(({ user }) => user);
    const listItem = mapPrismaEventToListItem({
      ...event,
      _count: { participations: participants.length },
    });

    return {
      ...listItem,
      description: event.description,
      equipment: event.equipment,
      contributionAmount:
        event.contributionAmount === null
          ? null
          : Number(event.contributionAmount),
      contributionNote: event.contributionNote,
      status: event.status as EventDetail['status'],
      approvalMode: event.approvalMode,
      organizerId: event.organizer.id,
      organizerName: event.organizer.name,
      cancellationReason: event.cancellationReason?.name ?? null,
      cancellationNote: event.cancellationNote,
      stats: computeParticipantStats(
        participants,
        event.startAt,
        listItem.takenCount,
      ),
      statsMinParticipants: MIN_STATS_PARTICIPANTS,
    };
  }
}
