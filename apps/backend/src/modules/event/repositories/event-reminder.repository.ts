import { PrismaService } from '@/core/prisma/prisma.service';
import {
  EventStatus,
  ParticipationStatus,
  Prisma,
} from '@/generated/prisma/client';
import { occupancyOf } from '@/modules/event/domain/event';
import {
  EVENT_REMINDER_HORIZON,
  EventReminderCandidate,
} from '@/modules/event/domain/event-reminder';
import { EventReminderKind } from '@/modules/notification/domain/notification';
import { Injectable } from '@nestjs/common';

const candidateSelect = {
  id: true,
  startAt: true,
  publishedAt: true,
  minParticipants: true,
  maxParticipants: true,
  externalOccupiedSpots: true,
  organizerId: true,
  coOrganizers: { select: { id: true } },
  // Approved participations are the only ones that take a seat (ADR-0009).
  participations: {
    where: { status: ParticipationStatus.APPROVED },
    select: { userId: true },
  },
  reminders: { select: { kind: true, eventStartAt: true } },
} as const satisfies Prisma.EventSelect;

type CandidateRow = Prisma.EventGetPayload<{ select: typeof candidateSelect }>;

const mapCandidate = (row: CandidateRow): EventReminderCandidate => {
  const { occupiedSpots, missingToMinimum } = occupancyOf({
    minParticipants: row.minParticipants,
    maxParticipants: row.maxParticipants,
    externalOccupiedSpots: row.externalOccupiedSpots,
    approvedCount: row.participations.length,
  });
  return {
    id: row.id,
    startAt: row.startAt,
    publishedAt: row.publishedAt,
    sent: row.reminders,
    organizerIds: [row.organizerId, ...row.coOrganizers.map(({ id }) => id)],
    participantIds: row.participations.map(({ userId }) => userId),
    occupancy: {
      occupiedSpots,
      maxParticipants: row.maxParticipants,
      missingToMinimum,
    },
  };
};

// #233, ADR-0021: what the reminder poller reads and the mark that a reminder
// went out. Decides nothing; `dueEventReminders` does.
@Injectable()
export class EventReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  // The published, visible events starting within the window where a
  // reminder can be due; a cancelled or hidden one gets none.
  async findCandidates(now: Date): Promise<EventReminderCandidate[]> {
    const rows = await this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        isHidden: false,
        startAt: {
          gt: new Date(now.getTime() + EVENT_REMINDER_HORIZON.minStartInMs),
          lte: new Date(now.getTime() + EVENT_REMINDER_HORIZON.maxStartInMs),
        },
      },
      select: candidateSelect,
      orderBy: { startAt: 'asc' },
    });
    return rows.map(mapCandidate);
  }

  // Takes the reminder for this start. True for the one caller that inserted
  // the row; anyone after it (a second pass, a second instance) gets false
  // and must send nothing.
  async claim(
    eventId: string,
    kind: EventReminderKind,
    eventStartAt: Date,
  ): Promise<boolean> {
    const { count } = await this.prisma.eventReminder.createMany({
      data: [{ eventId, kind, eventStartAt }],
      skipDuplicates: true,
    });
    return count === 1;
  }
}
