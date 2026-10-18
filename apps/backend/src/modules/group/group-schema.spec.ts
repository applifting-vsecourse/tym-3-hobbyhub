// Database constraints of groups that Prisma cannot express. Like
// event-schema.spec.ts, the suite needs a real PostgreSQL with the migrations
// applied and only runs on request:  DB_TESTS=1 pnpm backend test group-schema
//
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Group, GroupRole, Prisma, User } from '@/generated/prisma/client';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

const unique = (): string => Math.random().toString(36).slice(2);

describeDb('group schema constraints', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const inRolledBackTransaction = async (
    work: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        await work(tx);
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };

  const createUser = (tx: Prisma.TransactionClient): Promise<User> => {
    const now = new Date();
    return tx.user.create({
      data: {
        id: `test-${unique()}`,
        name: 'Test User',
        email: `test-${unique()}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  const createGroup = async (
    tx: Prisma.TransactionClient,
    data: Partial<Prisma.GroupUncheckedCreateInput> = {},
  ): Promise<Group> => {
    const category = await tx.activityCategory.create({
      data: { name: `cat-${unique()}` },
    });
    const activity = await tx.activity.create({
      data: {
        name: `act-${unique()}`,
        icon: 'florbal',
        categoryId: category.id,
        defaultMinParticipants: 2,
        defaultMaxParticipants: 10,
      },
    });
    return tx.group.create({
      data: {
        name: 'Florbalisté',
        description: 'Hrajeme.',
        activityId: activity.id,
        ...data,
      },
    });
  };

  it('accepts a valid group with its owner', async () => {
    await expect(
      inRolledBackTransaction(async (tx) => {
        const owner = await createUser(tx);
        const group = await createGroup(tx);
        await tx.groupMembership.create({
          data: { groupId: group.id, userId: owner.id, role: GroupRole.OWNER },
        });
      }),
    ).resolves.toBeUndefined();
  });

  it('allows only one owner per group', async () => {
    await expect(
      inRolledBackTransaction(async (tx) => {
        const [first, second] = [await createUser(tx), await createUser(tx)];
        const group = await createGroup(tx);
        for (const user of [first, second]) {
          await tx.groupMembership.create({
            data: { groupId: group.id, userId: user.id, role: GroupRole.OWNER },
          });
        }
      }),
    ).rejects.toThrow();
  });

  it('rejects a name shorter than 3 characters', async () => {
    await expect(
      inRolledBackTransaction((tx) => createGroup(tx, { name: '  ab ' })),
    ).rejects.toThrow();
  });

  it('rejects a blank description', async () => {
    await expect(
      inRolledBackTransaction((tx) => createGroup(tx, { description: '   ' })),
    ).rejects.toThrow();
  });
});
