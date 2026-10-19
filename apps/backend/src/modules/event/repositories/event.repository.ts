import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ParticipationStatus,
  Activity as PrismaActivity,
  Event as PrismaEvent,
  Level as PrismaLevel,
} from '@/generated/prisma/client';
import {
  EventListItem,
  EventListPage,
  Page,
} from '@/modules/event/domain/event';
import { Injectable } from '@nestjs/common';

const TAKEN_STATUSES: ParticipationStatus[] = [
  ParticipationStatus.APPROVED,
  ParticipationStatus.ATTENDED,
];

const include = {
  activity: true,
  level: true,
  _count: {
    select: {
      participations: {
        where: { status: { in: TAKEN_STATUSES } },
      },
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
  },
  minParticipants: event.minParticipants,
  maxParticipants: event.maxParticipants,
  takenCount: event._count.participations + event.externalOccupiedSpots,
});

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  // The same set the map shows: public, published, not hidden by a moderator
  // and not over yet. Soonest first.
  async getUpcomingPublicEvents(
    now: Date,
    { limit, offset }: Page,
  ): Promise<EventListPage> {
    const where = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      isHidden: false,
      endAt: { gt: now },
    } as const;
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: limit,
        include,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { items: events.map(mapPrismaEventToListItem), total };
  }
}
