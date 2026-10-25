import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GroupRole,
  GroupStatus,
  RequestStatus,
  User,
} from '@/generated/prisma/client';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// What applicants write; the last request of each group goes without one, so
// the admin sees both.
const MESSAGES = [
  'Hraju třetí rok za firemní tým a hledám pravidelnou skupinu.',
  'Ahoj, přistěhoval jsem se nedávno do Prahy a rád bych se přidal.',
];
const REQUESTS_PER_GROUP = 2;

/**
 * F-07.3: waiting requests to join the groups the first user manages, from
 * users outside them, so member management has something to decide. Additive:
 * a person who ever asked to join a group is left alone there.
 */
export async function seedMembershipRequests(
  prisma: PrismaService,
  users: User[],
): Promise<void> {
  const [admin] = users;
  if (!admin) return;

  const groups = await prisma.group.findMany({
    where: {
      status: GroupStatus.ACTIVE,
      memberships: {
        some: {
          userId: admin.id,
          role: { in: [GroupRole.OWNER, GroupRole.ADMIN] },
        },
      },
    },
    include: {
      memberships: { select: { userId: true } },
      membershipRequests: { select: { userId: true } },
    },
  });

  const now = Date.now();
  let created = 0;
  for (const group of groups) {
    const taken = new Set([
      ...group.memberships.map((membership) => membership.userId),
      ...group.membershipRequests.map((request) => request.userId),
    ]);
    const applicants = users
      .filter((user) => !taken.has(user.id))
      .slice(0, REQUESTS_PER_GROUP);
    for (const [index, applicant] of applicants.entries()) {
      await prisma.membershipRequest.create({
        data: {
          groupId: group.id,
          userId: applicant.id,
          status: RequestStatus.PENDING,
          message: MESSAGES[index] ?? null,
          requestedAt: new Date(now - (index + 1) * DAY_IN_MS),
        },
      });
      created += 1;
    }
  }

  console.log(
    created
      ? `Created ${created} example membership request(s)`
      : 'No new example membership requests.',
  );
}
