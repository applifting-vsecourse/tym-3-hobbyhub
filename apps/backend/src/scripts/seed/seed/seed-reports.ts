import { PrismaService } from '@/core/prisma/prisma.service';
import { EventStatus, ReportStatus, User } from '@/generated/prisma/client';

const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * #240, ADR-0023: a few reports in every state, so the administrators' queue
 * has something to show. Additive: skips itself once any report exists. The
 * reasons come from the migration.
 */
export async function seedReports(
  prisma: PrismaService,
  users: User[],
): Promise<void> {
  if ((await prisma.report.count()) > 0) return;
  const [organizer, reporter, other, fourth] = users;
  if (!organizer || !reporter || !other || !fourth) return;

  const reasons = await prisma.reportReason.findMany({
    orderBy: { order: 'asc' },
  });
  const administrator = await prisma.administrator.findFirst({
    where: { deactivatedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const event = await prisma.event.findFirst({
    where: {
      organizerId: organizer.id,
      status: EventStatus.PUBLISHED,
      isHidden: false,
    },
    orderBy: { startAt: 'asc' },
  });
  if (reasons.length < 6 || !administrator || !event) return;
  const [harassment, inappropriate, scam, , , otherReason] = reasons;

  const now = Date.now();
  const ago = (hours: number): Date => new Date(now - hours * HOUR_IN_MS);

  await prisma.report.createMany({
    data: [
      {
        reporterId: reporter.id,
        targetEventId: event.id,
        reasonId: scam.id,
        text: 'Popis akce slibuje vstup zdarma, ale organizátor chce platbu předem na účet.',
        createdAt: ago(2),
      },
      {
        reporterId: other.id,
        targetEventId: event.id,
        reasonId: inappropriate.id,
        text: 'Fotka u akce je urážlivá a s hrou nemá nic společného.',
        createdAt: ago(5),
      },
      {
        reporterId: reporter.id,
        targetUserId: fourth.id,
        reasonId: harassment.id,
        text: 'Po akci mi opakovaně psal na soukromý kontakt, i když jsem ho požádala, ať přestane.',
        createdAt: ago(26),
        status: ReportStatus.IN_PROGRESS,
        assigneeId: administrator.id,
      },
      {
        reporterId: fourth.id,
        targetUserId: other.id,
        reasonId: otherReason.id,
        text: 'Na posledních třech akcích se přihlásil a nepřišel, bez omluvy.',
        createdAt: ago(72),
        status: ReportStatus.RESOLVED,
        assigneeId: administrator.id,
        resolutionNote:
          'Nepřítomnost na akcích není důvod k blokaci, řeší skóre spolehlivosti.',
        resolvedAt: ago(48),
        reporterNotifiedAt: ago(48),
      },
    ],
  });
  console.log('Created example reports');
}
