// Handing a group over (F-07.3b) against a real PostgreSQL, because it hangs
// on the `group_membership_one_owner_key` partial unique index: the old owner
// must be demoted before the new one is promoted. It only runs on request:
//   DB_TESTS=1 pnpm backend test group-membership
// The repository opens its own transaction, so the case cannot run inside a
// rolled-back one like group-list.spec.ts; it deletes what it made instead.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { GroupRole } from '@/generated/prisma/client';
import { GroupRepository } from './repositories/group.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

const unique = (): string => Math.random().toString(36).slice(2);

describeDb('group membership', () => {
  const prisma = new PrismaService();
  const repository = new GroupRepository(prisma);
  const userIds: string[] = [];
  let groupId: string;
  let categoryId: string;

  const createUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        id: `test-${unique()}`,
        name: 'Test User',
        email: `test-${unique()}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    userIds.push(user.id);
    return user.id;
  };

  beforeEach(async () => {
    const category = await prisma.activityCategory.create({
      data: {
        name: `cat-${unique()}`,
        icon: `cat-${unique()}`,
        order: Math.floor(Math.random() * 2_000_000_000),
      },
    });
    categoryId = category.id;
    const activity = await prisma.activity.create({
      data: {
        name: `act-${unique()}`,
        icon: 'florbal',
        categoryId,
        defaultMinParticipants: 2,
        defaultMaxParticipants: 10,
      },
    });
    const group = await prisma.group.create({
      data: {
        name: `group-${unique()}`,
        description: 'Test',
        activityId: activity.id,
      },
    });
    groupId = group.id;
  });

  afterEach(async () => {
    await prisma.group.delete({ where: { id: groupId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.activity.deleteMany({ where: { categoryId } });
    await prisma.activityCategory.delete({ where: { id: categoryId } });
    userIds.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('hands the group over and keeps the old owner as an admin', async () => {
    const owner = await createUser();
    const member = await createUser();
    await prisma.groupMembership.createMany({
      data: [
        { groupId, userId: owner, role: GroupRole.OWNER },
        { groupId, userId: member, role: GroupRole.MEMBER },
      ],
    });

    await expect(
      repository.transferOwnership(groupId, owner, member),
    ).resolves.toBe('TRANSFERRED');

    await expect(repository.getMemberRole(groupId, owner)).resolves.toBe(
      'ADMIN',
    );
    await expect(repository.getMemberRole(groupId, member)).resolves.toBe(
      'OWNER',
    );
  });

  it('changes nothing when the new owner is not a member', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    await prisma.groupMembership.create({
      data: { groupId, userId: owner, role: GroupRole.OWNER },
    });

    await expect(
      repository.transferOwnership(groupId, owner, stranger),
    ).resolves.toBe('TARGET_NOT_MEMBER');

    await expect(repository.getMemberRole(groupId, owner)).resolves.toBe(
      'OWNER',
    );
  });

  it('refuses a hand-over by someone who is no longer the owner', async () => {
    const owner = await createUser();
    const first = await createUser();
    const second = await createUser();
    await prisma.groupMembership.createMany({
      data: [
        { groupId, userId: owner, role: GroupRole.OWNER },
        { groupId, userId: first, role: GroupRole.MEMBER },
        { groupId, userId: second, role: GroupRole.MEMBER },
      ],
    });
    await repository.transferOwnership(groupId, owner, first);

    await expect(
      repository.transferOwnership(groupId, owner, second),
    ).resolves.toBe('NOT_OWNER');

    await expect(repository.getMemberRole(groupId, first)).resolves.toBe(
      'OWNER',
    );
    await expect(repository.getMemberRole(groupId, second)).resolves.toBe(
      'MEMBER',
    );
  });

  it('reports a role change for someone who is not a member', async () => {
    const stranger = await createUser();

    await expect(
      repository.setMemberRole(groupId, stranger, 'ADMIN'),
    ).resolves.toBeNull();
  });
});
