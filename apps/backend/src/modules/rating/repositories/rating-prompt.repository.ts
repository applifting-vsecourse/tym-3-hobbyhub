import { PrismaService } from '@/core/prisma/prisma.service';
import { RatingPromptKind } from '@/modules/notification/domain/notification';
import {
  RatingPromptCandidate,
  ratingPromptHorizon,
} from '@/modules/rating/domain/rating-prompt';
import { Injectable } from '@nestjs/common';

// #236, ADR-0021: what the rating-prompt cron reads and the record that a
// call went out. Validates nothing; the rules are in `domain/rating-prompt.ts`.
@Injectable()
export class RatingPromptRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Events that took place and whose rating period is on, at least two hours
   * after their end: never one cancelled, not held or hidden by an
   * administrator, whose ratings would not count.
   */
  async findCandidates(now: Date): Promise<RatingPromptCandidate[]> {
    const { endedAfter, endedBefore } = ratingPromptHorizon(now);
    const events = await this.prisma.event.findMany({
      where: {
        status: { in: ['PUBLISHED', 'FINISHED'] },
        isHidden: false,
        endAt: { gt: endedAfter, lte: endedBefore },
      },
      select: {
        id: true,
        endAt: true,
        organizerId: true,
        coOrganizers: { select: { id: true } },
        participations: { select: { userId: true, status: true } },
        ratingPrompts: { select: { kind: true } },
      },
      orderBy: { endAt: 'asc' },
    });
    if (events.length === 0) return [];

    const ratings = await this.prisma.rating.findMany({
      where: { eventId: { in: events.map(({ id }) => id) } },
      select: { eventId: true, participantId: true, direction: true },
    });
    const ratedBy = (eventId: string, direction: string): string[] =>
      ratings
        .filter((r) => r.eventId === eventId && r.direction === direction)
        .map((r) => r.participantId);

    return events.map((event) => ({
      id: event.id,
      endAt: event.endAt,
      organizerId: event.organizerId,
      coOrganizerIds: event.coOrganizers.map(({ id }) => id),
      seats: event.participations,
      sent: event.ratingPrompts.map(({ kind }) => kind),
      ratedOrganizer: ratedBy(event.id, 'TO_ORGANIZER'),
      ratedByOrganizer: ratedBy(event.id, 'TO_PARTICIPANT'),
    }));
  }

  /**
   * Takes the call for the event. True for the one caller that inserted the
   * row; anyone after it (a second pass, a second instance) gets false and
   * must send nothing.
   */
  async claim(eventId: string, kind: RatingPromptKind): Promise<boolean> {
    const { count } = await this.prisma.ratingPrompt.createMany({
      data: [{ eventId, kind }],
      skipDuplicates: true,
    });
    return count === 1;
  }
}
