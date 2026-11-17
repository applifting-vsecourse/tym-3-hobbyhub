import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma, User } from '@/generated/prisma/client';

/**
 * #236, ADR-0027: ratings of two finished events. "Badminton před dvěma
 * týdny" is past its rating period: both ways rated and revealed, so the
 * organizer has a score of three and the participants one each. "Včerejší
 * florbal" is still within it: one participant has rated the organizer, which
 * nobody else sees yet, and the rest is left for the forms of #234 and #235.
 * Additive: skips itself once any rating exists.
 */
export async function seedRatings(
  prisma: PrismaService,
  users: User[],
): Promise<void> {
  if ((await prisma.rating.count()) > 0) return;
  const [organizer, ...others] = users;
  if (!organizer || others.length < 3) return;

  const eventOf = (title: string): Promise<{ id: string } | null> =>
    prisma.event.findFirst({
      where: { title, organizerId: organizer.id },
      select: { id: true },
    });
  const revealed = await eventOf('Badminton před dvěma týdny');
  const open = await eventOf('Včerejší florbal');
  if (!revealed || !open) return;

  const [first, second, third] = others;
  const toOrganizer = (
    eventId: string,
    author: User,
    stars: number,
    comment?: string,
  ): Prisma.RatingCreateManyInput => ({
    eventId,
    participantId: author.id,
    direction: 'TO_ORGANIZER' as const,
    authorId: author.id,
    ratedUserId: organizer.id,
    stars,
    comment,
  });
  const toParticipant = (
    eventId: string,
    participant: User,
    stars: number,
    comment?: string,
  ): Prisma.RatingCreateManyInput => ({
    eventId,
    participantId: participant.id,
    direction: 'TO_PARTICIPANT' as const,
    authorId: organizer.id,
    ratedUserId: participant.id,
    stars,
    comment,
  });

  await prisma.rating.createMany({
    data: [
      toOrganizer(
        revealed.id,
        first,
        5,
        'Super organizace, kurt zamluvený včas.',
      ),
      toOrganizer(revealed.id, second, 4),
      toOrganizer(
        revealed.id,
        third,
        2,
        'Začátek se o půl hodiny posunul bez upozornění.',
      ),
      toParticipant(revealed.id, first, 5),
      toParticipant(revealed.id, second, 3, 'Dorazil o dvacet minut později.'),
      toParticipant(revealed.id, third, 5),
      toOrganizer(open.id, first, 5, 'Skvělá parta, příště zase.'),
    ],
  });
  console.log('Created example ratings');
}
