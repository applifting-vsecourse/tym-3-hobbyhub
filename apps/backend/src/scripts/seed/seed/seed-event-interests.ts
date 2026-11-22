import { PrismaService } from '@/core/prisma/prisma.service';
import { User } from '@/generated/prisma/client';

/**
 * #231, ADR-0030: the "Zajímá mě" list of the second example user, so every
 * state of it can be clicked through: events still on,
 * one that is over, one that was called off, and one an administrator hid,
 * which the list leaves out. Every example event is the first user's, so the
 * second one may save them. Additive: skips itself once any interest exists.
 */
export async function seedEventInterests(
  prisma: PrismaService,
  users: User[],
): Promise<void> {
  if ((await prisma.eventInterest.count()) > 0) return;
  const [organizer, saver] = users;
  if (!organizer || !saver) return;

  const titles = [
    'Páteční badminton',
    'Šachy online',
    'Výšlap na Padrť',
    'Včerejší florbal',
    'Zrušený tenisový turnaj',
    'Skrytá moderátorem',
  ];
  const events = await prisma.event.findMany({
    where: { title: { in: titles }, organizerId: organizer.id },
    select: { id: true },
  });
  await prisma.eventInterest.createMany({
    data: events.map((event) => ({ userId: saver.id, eventId: event.id })),
    skipDuplicates: true,
  });
}
