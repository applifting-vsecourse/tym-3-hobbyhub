// Database constraints of the user's private details and nickname. Like event-schema.spec.ts,
// the suite needs a real PostgreSQL with the migrations applied and only runs
// on request:  DB_TESTS=1 pnpm backend test user-schema
//
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  ProfileRepository,
  ProfileRow,
  ProfileUpdateRefusal,
} from '@/modules/profile/repositories/profile.repository';
import { nicknamePreviousChangeAtMost } from '@/shared/auth/registration/nickname';
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

  const createUser = (
    data: Partial<Prisma.UserCreateInput> = {},
  ): Promise<void> =>
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
          ...data,
        },
      });
    });

  it.each([[null], [OLDEST_BIRTH_YEAR], [1990]])(
    'accepts the birth year %p',
    async (birthYear) => {
      await createUser({ birthYear });
    },
  );

  it('rejects a birth year before 1900 (user_birth_year_range)', async () => {
    await expect(
      createUser({ birthYear: OLDEST_BIRTH_YEAR - 1 }),
    ).rejects.toThrow('user_birth_year_range');
  });

  // #212, ADR-0025: the nickname in its three columns.
  describe('the nickname', () => {
    const nickname = (
      displayUsername: string | null,
      username: string | null = displayUsername?.toLowerCase() ?? null,
      name: string = displayUsername ?? 'Test User',
    ): {
      name: string;
      displayUsername: string | null;
      username: string | null;
    } => ({ name, displayUsername, username });

    it('accepts a nickname kept in step in all three columns', async () => {
      await createUser(nickname(`Jana.${unique().slice(0, 8)}_1`));
    });

    it('accepts an account without a nickname', async () => {
      await createUser(nickname(null));
    });

    it.each([
      ['too short', 'ab'],
      ['upper case', 'Jana'],
      ['a space', 'jana nova'],
      ['too long', 'a'.repeat(31)],
    ])('rejects a username %s (user_username_format)', async (_, username) => {
      await expect(createUser({ name: 'Test User', username })).rejects.toThrow(
        'user_username_format',
      );
    });

    it.each([
      ['another nickname', 'Petr'],
      ['no displayUsername', null],
    ])(
      'rejects a username next to %s (user_display_username_matches)',
      async (_, displayUsername) => {
        await expect(
          createUser(nickname(displayUsername, `jana${unique().slice(0, 8)}`)),
        ).rejects.toThrow('user_display_username_matches');
      },
    );

    it('rejects a name other than the nickname (user_name_is_display_username)', async () => {
      const shown = `Jana${unique().slice(0, 8)}`;
      await expect(
        createUser(nickname(shown, shown.toLowerCase(), 'Someone Else')),
      ).rejects.toThrow('user_name_is_display_username');
    });

    // Review of #258: the 30 days hold even for two requests sent at once.
    it('changes the nickname only once for two saves sent at the same time', async () => {
      const id = `test-${unique()}`;
      const now = new Date();
      const shown = `Jana${unique().slice(0, 8)}`;
      await prisma.user.create({
        data: {
          id,
          email: `test-${unique()}@example.com`,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
          ...nickname(shown),
        },
      });
      try {
        const repository = new ProfileRepository(prisma);
        const change = (
          to: string,
        ): Promise<ProfileRow | ProfileUpdateRefusal> =>
          repository.updatePublic(id, {
            nickname: {
              nickname: to,
              changedAt: now,
              previousChangeAtMost: nicknamePreviousChangeAtMost(now),
            },
          });
        const results = await Promise.all([
          change(`A${shown}`),
          change(`B${shown}`),
        ]);
        expect(
          results.filter((result) => result === 'NICKNAME_CHANGE_TOO_SOON'),
        ).toHaveLength(1);
      } finally {
        await prisma.user.delete({ where: { id } });
      }
    });
  });

  // #24: "remove my location" must leave nothing behind. The columns are read
  // from the database, so a location column added later fails here until
  // clearLocation covers it.
  it('clearLocation empties every home, temporary and radius column', async () => {
    const id = `test-${unique()}`;
    const now = new Date();
    await prisma.user.create({
      data: {
        id,
        name: 'Test User',
        email: `test-${unique()}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        homeStreet: 'Sokolovská 12',
        homeCity: 'Praha 8',
        homePostalCode: '186 00',
        homeCountry: 'Česko',
        homeDistrict: 'Karlín',
        homePlaceName: 'Doma',
        homeLatitude: 50.0942,
        homeLongitude: 14.4421,
        temporaryStreet: 'Hlavní 1',
        temporaryCity: 'Brno',
        temporaryPostalCode: '602 00',
        temporaryCountry: 'Česko',
        temporaryDistrict: 'Centrum',
        temporaryPlaceName: 'Dovolená',
        temporaryLatitude: 49.1951,
        temporaryLongitude: 16.6068,
        temporaryLocationValidUntil: new Date('2999-01-01T00:00:00Z'),
        travelRadiusKm: 30,
      },
    });
    try {
      await new ProfileRepository(prisma).clearLocation(id);

      const columns = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'user'
          AND (column_name LIKE 'home%' OR column_name LIKE 'temporary%' OR column_name = 'travelRadiusKm')`;
      expect(columns.length).toBeGreaterThanOrEqual(18);
      const [row] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${columns.map((c) => `"${c.column_name}"`).join(', ')} FROM "user" WHERE id = $1`,
        id,
      );
      expect(Object.values(row).every((value) => value === null)).toBe(true);
    } finally {
      await prisma.user.delete({ where: { id } });
    }
  });
});
