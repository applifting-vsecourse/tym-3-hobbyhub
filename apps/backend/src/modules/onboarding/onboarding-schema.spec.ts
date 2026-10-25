// Database limits of the onboarding fields (CHECK constraints). They need a real
// PostgreSQL with the migrations applied, which CI does not start, so the suite
// only runs on request:  DB_TESTS=1 pnpm backend test onboarding-schema
//
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma, User } from '@/generated/prisma/client';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

describeDb('onboarding schema constraints', () => {
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

  const createUser = (
    tx: Prisma.TransactionClient,
    extra: Partial<Prisma.UserUncheckedCreateInput>,
  ): Promise<User> => {
    const now = new Date();
    const id = `test-${Math.random().toString(36).slice(2)}`;
    return tx.user.create({
      data: {
        id,
        name: 'Test User',
        email: `${id}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        ...extra,
      },
    });
  };

  it('refuses a home address without a position', async () => {
    await expect(
      inRolledBackTransaction((tx) =>
        createUser(tx, { homeCity: 'Praha 8', homeStreet: 'Sokolovská 12' }),
      ),
    ).rejects.toThrow();
  });

  it('accepts the edges of the allowed ranges', async () => {
    await inRolledBackTransaction(async (tx) => {
      await createUser(tx, {
        bio: 'a'.repeat(300),
        travelRadiusKm: 5,
        onboardingStepsDone: 3,
      });
      await createUser(tx, { travelRadiusKm: 100 });
    });
  });

  it.each([
    ['bio over 300 characters', { bio: 'a'.repeat(301) }],
    ['range under 5 km', { travelRadiusKm: 4 }],
    ['range over 100 km', { travelRadiusKm: 101 }],
    ['more than 3 steps done', { onboardingStepsDone: 4 }],
  ])('refuses %s', async (_name, extra) => {
    await expect(
      inRolledBackTransaction((tx) => createUser(tx, extra)),
    ).rejects.toThrow();
  });

  it('keeps a level on an activity only if it is in the catalogue', async () => {
    await expect(
      inRolledBackTransaction(async (tx) => {
        const user = await createUser(tx, {});
        const category = await tx.activityCategory.create({
          data: { name: `cat-${Math.random().toString(36).slice(2)}` },
        });
        const activity = await tx.activity.create({
          data: {
            name: `act-${Math.random().toString(36).slice(2)}`,
            icon: 'florbal',
            categoryId: category.id,
            defaultMinParticipants: 2,
            defaultMaxParticipants: 10,
          },
        });
        await tx.userActivity.create({
          data: {
            userId: user.id,
            activityId: activity.id,
            levelId: 'no-such-level',
          },
        });
      }),
    ).rejects.toThrow();
  });
});
