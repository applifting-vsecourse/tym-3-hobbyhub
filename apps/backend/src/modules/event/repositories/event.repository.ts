import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EventStatus,
  ParticipationStatus,
  Prisma,
  Activity as PrismaActivity,
  Event as PrismaEvent,
  Group as PrismaGroup,
  Level as PrismaLevel,
  RequestStatus,
} from '@/generated/prisma/client';
import {
  ADMIN_USER_EVENTS_LIMIT,
  AdminEventDetail,
  AdminEventListItem,
  AdminUserEvents,
  CancelEventData,
  CreateEventData,
  Event,
  EventAudience,
  EventChangeResult,
  EventDetail,
  EventFacts,
  EventFilter,
  EventListFilter,
  EventListItem,
  EventListPage,
  EventLocation,
  EventSeatFacts,
  EventSeatsChangeResult,
  GeoPoint,
  GroupEventListItem,
  GroupEventPage,
  GroupEventsPeriod,
  HiddenEventAudience,
  INVOLVED_PARTICIPATION_STATUSES,
  MIN_STATS_PARTICIPANTS,
  NO_EVENT_FILTER,
  occupancyOf,
  Page,
  ParticipantEventInfo,
  SIMILAR_EVENTS_LIMIT,
  SIMILAR_EVENTS_WINDOW_DAYS,
  UpdateEventData,
} from '@/modules/event/domain/event';
import { computeParticipantStats } from '@/modules/event/domain/participant-stats';
import { isPubliclyVisible } from '@/modules/group/domain/group';
import {
  ADMIN_PAGE_SIZE,
  AdminListQuery,
  AdminPage,
} from '@/shared/admin-auth/domain/administration';
import { recordAuditLogEntry } from '@/shared/audit-log/audit-log';
import { Injectable } from '@nestjs/common';
import {
  aheadFirstOrder,
  allOf,
  eventFilterConditions,
  eventListRangeConditions,
  LIST_TAKEN_STATUSES,
  notOrganizedBy,
} from './event-list.sql';

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

// #238: an event row as the administration lists it.
const adminListSelect = {
  id: true,
  title: true,
  status: true,
  visibility: true,
  isHidden: true,
  startAt: true,
  createdAt: true,
  activity: { select: { name: true } },
  organizer: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
} as const satisfies Prisma.EventSelect;

const mapAdminListItem = (
  row: Prisma.EventGetPayload<{ select: typeof adminListSelect }>,
): AdminEventListItem => ({
  id: row.id,
  title: row.title,
  status: row.status,
  visibility: row.visibility,
  isHidden: row.isHidden,
  startAt: row.startAt,
  createdAt: row.createdAt,
  activityName: row.activity.name,
  organizer: row.organizer,
  group: row.group,
});

// Great-circle distance in km (haversine) from `near` to the event, with the
// alias `e`. Null for a hidden address, which is never located (#218), and
// for an event without coordinates; those sort last.
const distanceKmSql = ({ latitude, longitude }: GeoPoint): Prisma.Sql =>
  Prisma.sql`CASE WHEN e."isAddressPublic"
      AND e."locationLatitude" IS NOT NULL AND e."locationLongitude" IS NOT NULL
    THEN 2 * 6371 * asin(sqrt(least(1, 
      power(sin(radians(e."locationLatitude"::float8 - ${latitude}::float8) / 2), 2)
      + cos(radians(${latitude}::float8)) * cos(radians(e."locationLatitude"::float8))
        * power(sin(radians(e."locationLongitude"::float8 - ${longitude}::float8) / 2), 2))))
    END`;

// The condition of the public event list, with the alias `e` for the event and
// `a` for its activity: what is public and not over, narrowed by the filter.
const listCondition = (
  now: Date,
  filter: EventListFilter,
  withRadius = true,
): Prisma.Sql =>
  allOf([
    Prisma.sql`e."status" = 'PUBLISHED'`,
    Prisma.sql`e."visibility" = 'PUBLIC'`,
    Prisma.sql`NOT e."isHidden"`,
    Prisma.sql`e."endAt" > ${now}`,
    ...eventFilterConditions(filter),
    ...eventListRangeConditions(filter),
    // #261: no position gives a NULL distance, which is never within a radius.
    ...(withRadius && filter.around
      ? [
          Prisma.sql`${distanceKmSql(filter.around)} <= ${filter.around.radiusKm}`,
        ]
      : []),
  ]);

// F-07.2: what may be shown to someone, depending on who they are: public or
// group-only, never a draft, a private event or one hidden by a moderator.
// Whether this person may see a group-only one is the service's to decide
// (`canSeeEvent`).
const SHOWABLE_EVENT = {
  status: { not: 'DRAFT' },
  visibility: { in: ['PUBLIC', 'GROUP_ONLY'] },
  isHidden: false,
} as const satisfies Prisma.EventWhereInput;

// What the rules about seats read of an event (`EventFacts`). The approved
// people come along, so a caller can find one of them without a second query.
const eventFactsSelect = {
  id: true,
  status: true,
  visibility: true,
  groupId: true,
  startAt: true,
  endAt: true,
  approvalMode: true,
  minParticipants: true,
  maxParticipants: true,
  externalOccupiedSpots: true,
  organizerId: true,
  isHidden: true,
  coOrganizers: { select: { id: true } },
  participations: {
    where: { status: ParticipationStatus.APPROVED },
    select: { userId: true },
  },
} as const satisfies Prisma.EventSelect;

type EventFactsRow = Prisma.EventGetPayload<{
  select: typeof eventFactsSelect;
}>;

const mapEventFacts = (event: EventFactsRow): EventFacts => {
  const { freeSpots } = occupancyOf({
    minParticipants: event.minParticipants,
    maxParticipants: event.maxParticipants,
    externalOccupiedSpots: event.externalOccupiedSpots,
    approvedCount: event.participations.length,
  });
  return {
    id: event.id,
    status: event.status,
    visibility: event.visibility,
    groupId: event.groupId,
    startAt: event.startAt,
    endAt: event.endAt,
    approvalMode: event.approvalMode,
    organizerIds: [
      event.organizerId,
      ...event.coOrganizers.map((coOrganizer) => coOrganizer.id),
    ],
    freeSpots,
    isHidden: event.isHidden,
  };
};

const listInclude = {
  activity: true,
  level: true,
  organizer: { select: { name: true } },
  group: { select: { id: true, name: true, visibility: true, status: true } },
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
    organizer: { name: string };
    group: Pick<PrismaGroup, 'id' | 'name' | 'visibility' | 'status'> | null;
    _count: { participations: number };
  },
  distanceKm: number | null = null,
): EventListItem => ({
  id: event.id,
  title: event.title,
  imageUrl: event.imageUrl,
  startAt: event.startAt,
  endAt: event.endAt,
  venueType: event.venueType,
  isAddressPublic: event.isAddressPublic,
  // #218: a hidden address may be someone's home: neither the name of the
  // place nor its position leaves the server.
  placeName: event.isAddressPublic ? event.locationPlaceName : null,
  district: event.locationDistrict,
  city: event.locationCity,
  level: event.level?.name ?? null,
  latitude: event.isAddressPublic
    ? (event.locationLatitude?.toNumber() ?? null)
    : null,
  longitude: event.isAddressPublic
    ? (event.locationLongitude?.toNumber() ?? null)
    : null,
  distanceKm,
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
  organizerName: event.organizer.name,
  // A private or cancelled group has no public page to link to.
  group:
    event.group && isPubliclyVisible(event.group)
      ? { id: event.group.id, name: event.group.name }
      : null,
  contributionAmount:
    event.contributionAmount === null ? null : Number(event.contributionAmount),
  isHidden: event.isHidden,
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
        latitude: event.locationLatitude?.toNumber() ?? null,
        longitude: event.locationLongitude?.toNumber() ?? null,
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
  isAddressPublic: event.isAddressPublic,
  startAt: event.startAt,
  endAt: event.endAt,
  publishedAt: event.publishedAt,
  createdAt: event.createdAt,
  minParticipants: event.minParticipants,
  maxParticipants: event.maxParticipants,
  contributionAmount: event.contributionAmount?.toNumber() ?? null,
  contributionNote: event.contributionNote,
  contact: event.contact,
  externalChatUrl: event.externalChatUrl,
  location: mapLocation(event),
  activity: {
    id: event.activity.id,
    name: event.activity.name,
    icon: event.activity.icon,
    defaultMinParticipants: event.activity.defaultMinParticipants,
    defaultMaxParticipants: event.activity.defaultMaxParticipants,
  },
  approvalMode: event.approvalMode,
  organizerId: event.organizerId,
  cancellationReason: event.cancellationReason?.name ?? null,
  cancellationNote: event.cancellationNote,
  isHidden: event.isHidden,
  hiddenReason: event.hiddenReason,
  ...occupancyOf({
    minParticipants: event.minParticipants,
    maxParticipants: event.maxParticipants,
    externalOccupiedSpots: event.externalOccupiedSpots,
    approvedCount: event._count.participations,
  }),
});

// #232: the free seats of the event locked by the caller, before it writes.
const freeSpotsOfLocked = async (
  tx: Prisma.TransactionClient,
  id: string,
  approvedCount: number,
): Promise<number> => {
  const event = await tx.event.findUniqueOrThrow({
    where: { id },
    select: {
      minParticipants: true,
      maxParticipants: true,
      externalOccupiedSpots: true,
    },
  });
  return occupancyOf({ ...event, approvedCount }).freeSpots;
};

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
        venueType: 'PLACE',
        isAddressPublic: data.isAddressPublic,
        approvalMode: data.approvalMode,
        startAt: data.startAt,
        endAt: data.endAt,
        minParticipants: data.minParticipants,
        maxParticipants: data.maxParticipants,
        externalOccupiedSpots: data.externalOccupiedSpots,
        contributionAmount: data.contributionAmount ?? null,
        contributionNote: data.contributionNote ?? null,
        contact: data.contact ?? null,
        externalChatUrl: data.externalChatUrl ?? null,
        locationStreet: data.location.street,
        locationCity: data.location.city,
        locationPostalCode: data.location.postalCode,
        locationCountry: data.location.country,
        locationPlaceName: data.location.placeName ?? null,
        locationLatitude: data.location.latitude ?? null,
        locationLongitude: data.location.longitude ?? null,
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
  ): Promise<EventSeatsChangeResult> {
    return this.prisma.$transaction(async (tx) => {
      // Lock first, as createApproved does, so a request cannot be approved
      // between counting the seats and writing the new maximum.
      await tx.$queryRaw`SELECT "id" FROM "event" WHERE "id" = ${id} FOR UPDATE`;
      const approved = await tx.participation.count({
        where: { eventId: id, status: ParticipationStatus.APPROVED },
      });
      const freeSpotsBefore = await freeSpotsOfLocked(tx, id, approved);
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
          isAddressPublic: data.isAddressPublic,
          approvalMode: data.approvalMode,
          startAt: data.startAt,
          endAt: data.endAt,
          minParticipants: data.minParticipants,
          maxParticipants: data.maxParticipants,
          externalOccupiedSpots: data.externalOccupiedSpots,
          contributionAmount: data.contributionAmount ?? null,
          contributionNote: data.contributionNote ?? null,
          contact: data.contact ?? null,
          externalChatUrl: data.externalChatUrl ?? null,
          locationStreet: data.location?.street ?? null,
          locationCity: data.location?.city ?? null,
          locationPostalCode: data.location?.postalCode ?? null,
          locationCountry: data.location?.country ?? null,
          locationPlaceName: data.location?.placeName ?? null,
          locationLatitude: data.location?.latitude ?? null,
          locationLongitude: data.location?.longitude ?? null,
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
      return {
        ok: true,
        event: mapPrismaEventToDomain(event),
        freeSpotsBefore,
      } as const;
    });
  }

  // F-05.6: the seats taken outside the app, under the same lock as an edit
  // and an approval, so the seats are counted and written in one go.
  async updateExternalOccupiedSpots(
    id: string,
    externalOccupiedSpots: number,
    now: Date,
  ): Promise<EventSeatsChangeResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "event" WHERE "id" = ${id} FOR UPDATE`;
      const approved = await tx.participation.count({
        where: { eventId: id, status: ParticipationStatus.APPROVED },
      });
      const freeSpotsBefore = await freeSpotsOfLocked(tx, id, approved);
      const event = await tx.event.findUniqueOrThrow({
        where: { id },
        select: { maxParticipants: true },
      });
      if (event.maxParticipants < externalOccupiedSpots + approved) {
        return { ok: false, violation: 'MAX_BELOW_OCCUPIED' } as const;
      }
      const { count } = await tx.event.updateMany({
        where: {
          id,
          status: { in: [EventStatus.DRAFT, EventStatus.PUBLISHED] },
          startAt: { gt: now },
        },
        data: { externalOccupiedSpots },
      });
      if (count === 0) {
        return { ok: false, violation: 'EVENT_NOT_CHANGEABLE' } as const;
      }
      const updated = await tx.event.findUniqueOrThrow({
        where: { id },
        include,
      });
      return {
        ok: true,
        event: mapPrismaEventToDomain(updated),
        freeSpotsBefore,
      } as const;
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
      // Same lock as createApproved and updateEvent: a seat is approved
      // either before the cancellation or after it, never in between.
      await tx.$queryRaw`SELECT "id" FROM "event" WHERE "id" = ${id} FOR UPDATE`;
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

  // Who an edit or a cancellation concerns (F-09.3). The waiting requests are
  // the request module's rows; reading their ids here spares the event module
  // a dependency on it, which would run in a circle (ADR-0015).
  async getEventAudience(eventId: string): Promise<EventAudience> {
    const [participations, requests] = await Promise.all([
      this.prisma.participation.findMany({
        where: { eventId, status: ParticipationStatus.APPROVED },
        select: { userId: true },
      }),
      this.prisma.participationRequest.findMany({
        where: { eventId, status: RequestStatus.PENDING },
        select: { userId: true },
      }),
    ]);
    return {
      participantIds: participations.map((row) => row.userId),
      applicantIds: requests.map((row) => row.userId),
    };
  }

  // #239: who hiding the event concerns, the waitlist and organizers too.
  async getHiddenEventAudience(eventId: string): Promise<HiddenEventAudience> {
    const [audience, waitlisted, event] = await Promise.all([
      this.getEventAudience(eventId),
      this.prisma.participation.findMany({
        where: { eventId, status: ParticipationStatus.WAITLISTED },
        select: { userId: true },
      }),
      this.prisma.event.findUniqueOrThrow({
        where: { id: eventId },
        select: { organizerId: true, coOrganizers: { select: { id: true } } },
      }),
    ]);
    return {
      ...audience,
      waitlistedIds: waitlisted.map((row) => row.userId),
      organizerIds: [
        event.organizerId,
        ...event.coOrganizers.map((coOrganizer) => coOrganizer.id),
      ],
    };
  }

  // #232: who watches the event for a free seat and still has none. The rows
  // are the "Zajímá mě" list's (ADR-0030); reading their ids here spares the
  // event module a dependency on that module, which depends on this one. Who
  // of them may still see the event is the service's to decide.
  async getFreeSpotWatcherIds(eventId: string): Promise<string[]> {
    const rows = await this.prisma.eventInterest.findMany({
      where: {
        eventId,
        watchesFreeSpot: true,
        user: {
          participations: {
            none: { eventId, status: ParticipationStatus.APPROVED },
          },
        },
      },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  }

  // #239, ADR-0022: an administrator hides an event, or brings it back, and
  // the audit log records it in the same transaction. Matches only an event
  // in the expected state, so two administrators at once cannot both act.
  async setHidden(
    id: string,
    change:
      | { kind: 'HIDE'; adminId: string; reason: string; at: Date }
      | { kind: 'RESTORE'; adminId: string },
  ): Promise<Event | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.event.updateMany({
        where:
          change.kind === 'HIDE'
            ? { id, isHidden: false, status: { not: EventStatus.DRAFT } }
            : { id, isHidden: true },
        data:
          change.kind === 'HIDE'
            ? {
                isHidden: true,
                hiddenAt: change.at,
                hiddenReason: change.reason,
                hiddenById: change.adminId,
              }
            : {
                isHidden: false,
                hiddenAt: null,
                hiddenReason: null,
                hiddenById: null,
              },
      });
      if (count === 0) return null;
      await recordAuditLogEntry(tx, {
        adminId: change.adminId,
        action: change.kind === 'HIDE' ? 'EVENT_HIDDEN' : 'EVENT_RESTORED',
        targetType: 'EVENT',
        targetId: id,
        description: change.kind === 'HIDE' ? change.reason : undefined,
      });
      const event = await tx.event.findUniqueOrThrow({
        where: { id },
        include,
      });
      return mapPrismaEventToDomain(event);
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
    // Sorting by distance and the radius both measure from a point; the radius
    // wins when both are sent, so the list is nearest first around the place.
    const origin = filter.around ?? filter.near;
    const distance = origin ? distanceKmSql(origin) : Prisma.sql`NULL::float8`;
    const orderBy = origin
      ? Prisma.sql`"distanceKm" ASC NULLS LAST, e."startAt" ASC, e."id" ASC`
      : Prisma.sql`e."startAt" ASC, e."id" ASC`;
    // With a radius the total and the events it cannot place come from one
    // query over the filter without the radius (#261).
    const { around } = filter;
    const [pageRows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<{ id: string; distanceKm: number | null }[]>`
        SELECT e."id", ${distance} AS "distanceKm" FROM "event" e
        JOIN "activity" a ON a."id" = e."activityId"
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${limit} OFFSET ${offset}`,
      around
        ? this.prisma.$queryRaw<{ total: bigint; withoutLocation: bigint }[]>`
            SELECT
              count(*) FILTER (WHERE ${distanceKmSql(around)} <= ${around.radiusKm}) AS "total",
              count(*) FILTER (
                WHERE e."venueType" <> 'ONLINE' AND ${distanceKmSql(around)} IS NULL
              ) AS "withoutLocation"
            FROM "event" e
            JOIN "activity" a ON a."id" = e."activityId"
            WHERE ${listCondition(now, filter, false)}`
        : this.prisma.$queryRaw<{ total: bigint; withoutLocation?: bigint }[]>`
            SELECT count(*) AS "total" FROM "event" e
            JOIN "activity" a ON a."id" = e."activityId"
            WHERE ${where}`,
    ]);
    const distances = new Map(pageRows.map((row) => [row.id, row.distanceKm]));
    return {
      items: await this.listItemsInOrder(
        pageRows.map((row) => row.id),
        distances,
      ),
      total: Number(totalRows[0]?.total ?? 0),
      ...(around
        ? { withoutLocationCount: Number(totalRows[0]?.withoutLocation ?? 0) }
        : {}),
    };
  }

  // Events like the given one, for the detail page: upcoming, public, with a
  // free seat, never the event itself. Those with the same activity, in the
  // same city (any place for an online source) and starting within the window
  // come first, nearest in time first; the rest of the same activity fills up
  // to the limit, also nearest in time first.
  async getSimilarEvents(
    eventId: string,
    now: Date,
    hiddenOrganizerIds: string[] = [],
  ): Promise<EventListItem[]> {
    const where = allOf([
      Prisma.sql`e."id" <> s."id"`,
      Prisma.sql`e."activityId" = s."activityId"`,
      Prisma.sql`e."status" = 'PUBLISHED'`,
      Prisma.sql`e."visibility" = 'PUBLIC'`,
      Prisma.sql`NOT e."isHidden"`,
      Prisma.sql`e."endAt" > ${now}`,
      ...eventListRangeConditions({ onlyWithFreeSpots: true }),
      ...(hiddenOrganizerIds.length > 0
        ? [notOrganizedBy(hiddenOrganizerIds)]
        : []),
    ]);
    const sameCity = Prisma.sql`(s."venueType" = 'ONLINE' OR (
      s."locationCity" IS NOT NULL
      AND lower(e."locationCity") = lower(s."locationCity")))`;
    const closeInTime = Prisma.sql`abs(extract(epoch FROM (e."startAt" - s."startAt"))) <= ${SIMILAR_EVENTS_WINDOW_DAYS * 86400}`;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT e."id" FROM "event" e
      JOIN "event" s ON s."id" = ${eventId}
      WHERE ${where}
      ORDER BY
        CASE WHEN ${sameCity} AND ${closeInTime} THEN 0 ELSE 1 END ASC,
        abs(extract(epoch FROM (e."startAt" - s."startAt"))) ASC,
        e."id" ASC
      LIMIT ${SIMILAR_EVENTS_LIMIT}`;
    return this.listItemsInOrder(rows.map((row) => row.id));
  }

  // The list cards of the ids in the order given; an id that is gone by now
  // (deleted between the two queries) is left out.
  private async listItemsInOrder(
    ids: string[],
    distances: Map<string, number | null> = new Map(),
  ): Promise<EventListItem[]> {
    const events = await this.prisma.event.findMany({
      where: { id: { in: ids } },
      include: listInclude,
    });
    const byId = new Map(events.map((event) => [event.id, event]));
    return ids.flatMap((id) => {
      const event = byId.get(id);
      return event
        ? [mapPrismaEventToListItem(event, distances.get(id) ?? null)]
        : [];
    });
  }

  // The list cards of the given events, for a caller that already knows which
  // ones it wants (F-06.3). Visibility is the caller's business.
  async getListItemsByIds(ids: string[]): Promise<EventListItem[]> {
    const events = await this.prisma.event.findMany({
      where: { id: { in: ids } },
      include: listInclude,
    });
    return events.map((event) => mapPrismaEventToListItem(event));
  }

  // F-06.3, #177: a page of the public events a person organizes (or
  // co-organizes), narrowed by the filter. The ones still on come first,
  // soonest first; then the ones that are over, latest first. A draft and an
  // event that was called off are left out: the list has no word for them.
  async getOrganizedBy(
    userId: string,
    now: Date,
    { limit, offset }: Page,
    filter: EventFilter = NO_EVENT_FILTER,
  ): Promise<EventListPage> {
    // A hidden event stays on the organizer's own list (ADR-0022).
    const where = allOf([
      Prisma.sql`e."status" IN ('PUBLISHED', 'FINISHED')`,
      Prisma.sql`e."visibility" = 'PUBLIC'`,
      Prisma.sql`(e."organizerId" = ${userId} OR EXISTS (
        SELECT 1 FROM "_EventCoOrganizers" c
        WHERE c."A" = e."id" AND c."B" = ${userId}))`,
      ...eventFilterConditions(filter),
    ]);
    const isAhead = Prisma.sql`(e."status" = 'PUBLISHED' AND e."endAt" >= ${now})`;
    const [pageRows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT e."id" FROM "event" e
        JOIN "activity" a ON a."id" = e."activityId"
        WHERE ${where}
        ORDER BY ${aheadFirstOrder(isAhead)}
        LIMIT ${limit} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS "total" FROM "event" e
        JOIN "activity" a ON a."id" = e."activityId"
        WHERE ${where}`,
    ]);
    return {
      items: await this.listItemsInOrder(pageRows.map((row) => row.id)),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  // The detail: public or group-only (the service checks who asks), and an
  // event that was cancelled or is over stays reachable, so a shared link
  // still explains what happened.
  async getShowableEventById(id: string): Promise<EventDetail | null> {
    return this.getDetailWhere({ id, ...SHOWABLE_EVENT });
  }

  // #239, ADR-0022: the same detail of an event an administrator hid, with the
  // reason. Only for its organizers; the service checks who asks.
  async getHiddenEventDetail(id: string): Promise<EventDetail | null> {
    return this.getDetailWhere({
      id,
      ...SHOWABLE_EVENT,
      isHidden: true,
    });
  }

  private async getDetailWhere(
    where: Prisma.EventWhereInput,
  ): Promise<EventDetail | null> {
    const event = await this.prisma.event.findFirst({
      where,
      include: {
        activity: true,
        level: true,
        cancellationReason: true,
        organizer: { select: { id: true, name: true } },
        group: {
          select: { id: true, name: true, visibility: true, status: true },
        },
        participations: {
          where: { status: { in: LIST_TAKEN_STATUSES } },
          select: { user: { select: { birthYear: true, gender: true } } },
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
      contributionNote: event.contributionNote,
      status: event.status as EventDetail['status'],
      approvalMode: event.approvalMode,
      organizerId: event.organizer.id,
      cancellationReason: event.cancellationReason?.name ?? null,
      cancellationNote: event.cancellationNote,
      visibility: event.visibility as EventDetail['visibility'],
      stats: computeParticipantStats(
        participants,
        event.startAt,
        listItem.takenCount,
      ),
      statsMinParticipants: MIN_STATS_PARTICIPANTS,
      hiddenReason: event.isHidden ? event.hiddenReason : null,
      rating: await this.getPublicRatingScore(event.id),
      // #218: the exact address only when the organizer made it public.
      location: event.isAddressPublic ? mapLocation(event) : null,
    };
  }

  // #236, ADR-0027: the event's score from the view `event_rating_score`,
  // which counts only revealed ratings. Others see it from three ratings on
  // (`publicAverage`); below that neither number, so none cannot be told from
  // two.
  private async getPublicRatingScore(
    eventId: string,
  ): Promise<EventDetail['rating']> {
    const rows = await this.prisma.$queryRaw<
      { count: number; publicAverage: number | null }[]
    >`
      SELECT "count", "publicAverage"
      FROM "event_rating_score"
      WHERE "eventId" = ${eventId}`;
    const row = rows[0];
    return row?.publicAverage != null
      ? { count: row.count, average: row.publicAverage }
      : { count: null, average: null };
  }

  // F-06.5: what the organizers and approved participants see on top of the
  // public detail. The caller has already checked who is asking.
  async getParticipantInfo(id: string): Promise<ParticipantEventInfo | null> {
    const event = await this.prisma.event.findFirst({
      where: { id, ...SHOWABLE_EVENT },
      include: { organizer: { select: { name: true } } },
    });
    if (!event) return null;
    return {
      venueType: event.venueType,
      location: mapLocation(event),
      organizerName: event.organizer.name,
      contact: event.contact,
      externalChatUrl: event.externalChatUrl,
    };
  }

  // F-06.1: the same events as the detail, seen by one person.
  async getShowableEventSeatFacts(
    id: string,
    userId: string,
  ): Promise<EventSeatFacts | null> {
    const event = await this.prisma.event.findFirst({
      where: { id, ...SHOWABLE_EVENT },
      select: eventFactsSelect,
    });
    if (!event) return null;
    return {
      ...mapEventFacts(event),
      hasSeat: event.participations.some(
        (participation) => participation.userId === userId,
      ),
    };
  }

  // F-07.2: whether someone holds or awaits a seat on the event, so a
  // group-only one stays visible to them after they leave the group.
  async isInvolvedIn(eventId: string, userId: string): Promise<boolean> {
    const [participations, requests] = await Promise.all([
      this.prisma.participation.count({
        where: {
          eventId,
          userId,
          status: { in: [...INVOLVED_PARTICIPATION_STATUSES] },
        },
      }),
      this.prisma.participationRequest.count({
        where: { eventId, userId, status: RequestStatus.PENDING },
      }),
    ]);
    return participations + requests > 0;
  }

  // F-07.2: a page of a group's events. Upcoming: not over yet, soonest
  // first. Past: over, newest first. Cancelled ones stay, drafts, private and
  // hidden ones never show; which visibilities the viewer gets is the
  // service's to decide.
  async countGroupEvents(
    groupId: string,
    filter: {
      period: GroupEventsPeriod;
      visibilities: GroupEventListItem['visibility'][];
      now: Date;
      hiddenOrganizerIds?: string[];
    },
  ): Promise<number> {
    return this.prisma.event.count({
      where: groupEventsWhere(groupId, filter),
    });
  }

  async getGroupEvents(
    groupId: string,
    {
      period,
      visibilities,
      now,
      hiddenOrganizerIds = [],
    }: {
      period: GroupEventsPeriod;
      visibilities: GroupEventListItem['visibility'][];
      now: Date;
      // #239: people whose events do not exist for the one asking.
      hiddenOrganizerIds?: string[];
    },
    { limit, offset }: Page,
  ): Promise<GroupEventPage> {
    const where = groupEventsWhere(groupId, {
      period,
      visibilities,
      now,
      hiddenOrganizerIds,
    });
    const direction = period === 'upcoming' ? 'asc' : 'desc';
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: listInclude,
        orderBy: [{ startAt: direction }, { id: direction }],
        skip: offset,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    return {
      items: events.map((event) => ({
        ...mapPrismaEventToListItem(event),
        status: event.status as GroupEventListItem['status'],
        visibility: event.visibility as GroupEventListItem['visibility'],
      })),
      total,
    };
  }

  // F-05.7: any event, public or not, for its organizers' own tools. Who may
  // see it is the service's to decide (`isOrganizerOf`): the organizer runs a
  // hidden or private event as well (F-05.2).
  async getEventFacts(id: string): Promise<EventFacts | null> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: eventFactsSelect,
    });
    return event ? mapEventFacts(event) : null;
  }

  // #238: the newest events a person organizes or holds a seat on.
  async getUserEventsForAdministration(
    userId: string,
  ): Promise<AdminUserEvents> {
    const [organized, participations] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          OR: [
            { organizerId: userId },
            { coOrganizers: { some: { id: userId } } },
          ],
        },
        select: adminListSelect,
        orderBy: [{ startAt: 'desc' }, { id: 'asc' }],
        take: ADMIN_USER_EVENTS_LIMIT,
      }),
      this.prisma.participation.findMany({
        where: { userId },
        select: { status: true, event: { select: adminListSelect } },
        orderBy: [{ event: { startAt: 'desc' } }, { id: 'asc' }],
        take: ADMIN_USER_EVENTS_LIMIT,
      }),
    ]);
    return {
      organized: organized.map(mapAdminListItem),
      participations: participations.map((row) => ({
        ...mapAdminListItem(row.event),
        participationStatus: row.status,
      })),
    };
  }

  // #238: every event for the administration, newest first, by title.
  async listForAdministration(
    query: AdminListQuery,
  ): Promise<AdminPage<AdminEventListItem>> {
    const where: Prisma.EventWhereInput = query.search
      ? { title: { contains: query.search, mode: 'insensitive' } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.offset,
        take: ADMIN_PAGE_SIZE,
        select: adminListSelect,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { total, items: rows.map(mapAdminListItem) };
  }

  // #238: the whole event with who runs it and who is on it, for the
  // administration. Hidden and draft events too.
  async getAdministrationDetail(id: string): Promise<AdminEventDetail | null> {
    const row = await this.prisma.event.findUnique({
      where: { id },
      include: {
        ...include,
        organizer: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } },
        hiddenBy: { select: { id: true, name: true } },
        participations: {
          select: {
            userId: true,
            status: true,
            waitlistPosition: true,
            user: { select: { name: true } },
          },
          orderBy: [
            { status: 'asc' },
            { waitlistPosition: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    });
    if (!row) return null;
    return {
      event: mapPrismaEventToDomain(row),
      isHidden: row.isHidden,
      hiddenAt: row.hiddenAt,
      hiddenBy: row.hiddenBy,
      organizer: row.organizer,
      group: row.group,
      participants: row.participations.map((participation) => ({
        userId: participation.userId,
        name: participation.user.name,
        status: participation.status,
        waitlistPosition: participation.waitlistPosition,
      })),
    };
  }
}

function groupEventsWhere(
  groupId: string,
  {
    period,
    visibilities,
    now,
    hiddenOrganizerIds = [],
  }: {
    period: GroupEventsPeriod;
    visibilities: GroupEventListItem['visibility'][];
    now: Date;
    hiddenOrganizerIds?: string[];
  },
): Prisma.EventWhereInput {
  return {
    groupId,
    status: { not: EventStatus.DRAFT },
    isHidden: false,
    visibility: { in: visibilities },
    endAt: period === 'upcoming' ? { gt: now } : { lte: now },
    ...(hiddenOrganizerIds.length > 0
      ? {
          organizerId: { notIn: hiddenOrganizerIds },
          coOrganizers: { none: { id: { in: hiddenOrganizerIds } } },
        }
      : {}),
  };
}
