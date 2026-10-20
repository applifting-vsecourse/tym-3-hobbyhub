import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EventStatus,
  ParticipationStatus,
  Activity as PrismaActivity,
  Event as PrismaEvent,
  Level as PrismaLevel,
} from '@/generated/prisma/client';
import {
  CreateEventData,
  Event,
  EventDetail,
  EventListItem,
  EventListPage,
  EventLocation,
  MIN_STATS_PARTICIPANTS,
  occupancyOf,
  Page,
} from '@/modules/event/domain/event';
import { computeParticipantStats } from '@/modules/event/domain/participant-stats';
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
  // and not over yet. Soonest first.
  async getUpcomingPublicEvents(
    now: Date,
    { limit, offset }: Page,
  ): Promise<EventListPage> {
    const where = {
      ...PUBLIC_EVENT,
      status: 'PUBLISHED',
      endAt: { gt: now },
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

  // Public detail: the list's visibility rules, but an event that was cancelled
  // or is over stays reachable, so a shared link still explains what happened.
  async getPublicEventById(id: string): Promise<EventDetail | null> {
    const event = await this.prisma.event.findFirst({
      where: { id, ...PUBLIC_EVENT },
      include: {
        activity: true,
        level: true,
        organizer: { select: { name: true } },
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
      status: event.status as EventDetail['status'],
      approvalMode: event.approvalMode,
      organizerName: event.organizer.name,
      stats: computeParticipantStats(
        participants,
        event.startAt,
        listItem.takenCount,
      ),
      statsMinParticipants: MIN_STATS_PARTICIPANTS,
    };
  }
}
