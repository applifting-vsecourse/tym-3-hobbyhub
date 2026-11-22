import { PrismaService } from '@/core/prisma/prisma.service';
import { User } from '@/generated/prisma/client';

/**
 * #231, ADR-0030: the "Zajímá mě" list of the second example user, so every
 * state of it can be clicked through: events still on,
 * one that is over, one that was called off, and one an administrator hid,
 * which the list leaves out. Every example event is the first user's, so the
 * second one may save them. Additive: skips itself once any interest exists.
 * #232: the full event they watch for a free seat comes on its own, so a
 * database seeded before it gets it too.
 */
export async function seedEventInterests(
  prisma: PrismaService,
  users: User[],
): Promise<void> {
  const [organizer, saver] = users;
  if (!organizer || !saver) return;
  const isFirstRun = (await prisma.eventInterest.count()) === 0;
  await seedWatchedEvent(prisma, organizer, saver);
  if (!isFirstRun) return;

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

// #232: "Sobotní tenisová čtyřhra" is full; the saver watches it. A row that
// is already there stays as it is: whoever switched the watching off keeps it
// off.
async function seedWatchedEvent(
  prisma: PrismaService,
  organizer: User,
  saver: User,
): Promise<void> {
  const event = await prisma.event.findFirst({
    where: { title: 'Sobotní tenisová čtyřhra', organizerId: organizer.id },
    select: { id: true },
  });
  if (!event) return;
  await prisma.eventInterest.upsert({
    where: { userId_eventId: { userId: saver.id, eventId: event.id } },
    create: { userId: saver.id, eventId: event.id, watchesFreeSpot: true },
    update: {},
  });
}
