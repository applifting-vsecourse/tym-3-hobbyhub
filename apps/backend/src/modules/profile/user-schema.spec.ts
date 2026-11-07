// Database constraints of the user's private details. Like event-schema.spec.ts,
// the suite needs a real PostgreSQL with the migrations applied and only runs
// on request:  DB_TESTS=1 pnpm backend test user-schema
//
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { OLDEST_BIRTH_YEAR } from '@/shared/auth/registration/registration';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

const unique = (): string => Math.random().toString(36).slice(2);

describeDb('user schema constraints', () => {
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

  const createUser = (birthYear: number | null): Promise<void> =>
    inRolledBackTransaction(async (tx) => {
      const now = new Date();
      await tx.user.create({
        data: {
          id: `test-${unique()}`,
          name: 'Test User',
          email: `test-${unique()}@example.com`,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
          birthYear,
        },
      });
    });

  it.each([[null], [OLDEST_BIRTH_YEAR], [1990]])(
    'accepts the birth year %p',
    async (birthYear) => {
      await createUser(birthYear);
    },
  );

  it('rejects a birth year before 1900 (user_birth_year_range)', async () => {
    await expect(createUser(OLDEST_BIRTH_YEAR - 1)).rejects.toThrow(
      'user_birth_year_range',
    );
  });
});
