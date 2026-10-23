// The rules of the group lists (F-07.8) against a real PostgreSQL, because
// they are `where` conditions in Prisma: which groups a stranger may find and
// how the cursor pages them. Like group-schema.spec.ts it only runs on request:
//   DB_TESTS=1 pnpm backend test group-list
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GroupRole,
  GroupStatus,
  GroupVisibility,
  Prisma,
  User,
} from '@/generated/prisma/client';
import { GroupRepository } from './repositories/group.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

const unique = (): string => Math.random().toString(36).slice(2);

// Far in the future, so the cases' groups come first in the newest-first
// lists, before any group already in the database.
const CREATED_AT = new Date('2099-01-01T00:00:00Z');

describeDb('group lists', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  type Fixture = {
    tx: Prisma.TransactionClient;
    repository: GroupRepository;
    createUser: (data?: Partial<Prisma.UserCreateInput>) => Promise<User>;
    createGroup: (
      data?: Partial<Prisma.GroupUncheckedCreateInput>,
      members?: { user: User; role?: GroupRole }[],
    ) => Promise<string>;
  };

  const inRolledBackTransaction = async (
    work: (fixture: Fixture) => Promise<void>,
  ): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
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
        const createUser: Fixture['createUser'] = (data = {}) =>
          tx.user.create({
            data: {
              id: `test-${unique()}`,
              name: 'Test User',
              email: `test-${unique()}@example.com`,
              emailVerified: true,
              createdAt: CREATED_AT,
              updatedAt: CREATED_AT,
              ...data,
            },
          });
        const createGroup: Fixture['createGroup'] = async (
          data = {},
          members = [],
        ) => {
          const group = await tx.group.create({
            data: {
              name: `group-${unique()}`,
              description: 'Test',
              activityId: activity.id,
              createdAt: CREATED_AT,
              ...data,
              memberships: {
                create: members.map(({ user, role }) => ({
                  userId: user.id,
                  role: role ?? GroupRole.MEMBER,
                })),
              },
            },
          });
          return group.id;
        };
        await work({
          tx,
          repository: new GroupRepository(tx as unknown as PrismaService),
          createUser,
          createGroup,
        });
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };

  // Every page of the discover list, in order, as one list of ids.
  const discoverAll = async (
    repository: GroupRepository,
    userId: string | undefined,
    pageSize: number,
  ): Promise<string[]> => {
    const ids: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await repository.listDiscoverableGroups(
        userId,
        pageSize,
        cursor,
      );
      ids.push(...page.items.map((group) => group.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return ids;
  };

  it('discovers only public active groups the user is not in', async () => {
    await inRolledBackTransaction(
      async ({ repository, createUser, createGroup }) => {
        const me = await createUser();
        const other = await createUser();
        const open = await createGroup({}, [
          { user: other, role: GroupRole.OWNER },
        ]);
        const isPrivate = await createGroup({
          visibility: GroupVisibility.PRIVATE,
        });
        const cancelled = await createGroup({
          status: GroupStatus.CANCELLED,
        });
        const mine = await createGroup({}, [
          { user: me, role: GroupRole.OWNER },
        ]);
        const joined = await createGroup({}, [
          { user: other, role: GroupRole.OWNER },
          { user: me },
        ]);

        const found = await discoverAll(repository, me.id, 50);
        expect(found).toContain(open);
        for (const hidden of [isPrivate, cancelled, mine, joined]) {
          expect(found).not.toContain(hidden);
        }
      },
    );
  });

  it('discovers every public active group for a visitor', async () => {
    await inRolledBackTransaction(
      async ({ repository, createUser, createGroup }) => {
        const member = await createUser();
        const withMembers = await createGroup({}, [
          { user: member, role: GroupRole.OWNER },
        ]);
        const isPrivate = await createGroup({
          visibility: GroupVisibility.PRIVATE,
        });
        const cancelled = await createGroup({
          status: GroupStatus.CANCELLED,
        });

        const found = await discoverAll(repository, undefined, 50);
        expect(found).toContain(withMembers);
        expect(found).not.toContain(isPrivate);
        expect(found).not.toContain(cancelled);
      },
    );
  });

  it('pages newest first without gaps or repeats, even on equal dates', async () => {
    await inRolledBackTransaction(async ({ repository, createGroup }) => {
      // Three share a date, so only the id keeps their order stable.
      const ids = [
        await createGroup({ createdAt: new Date('2099-01-03T00:00:00Z') }),
        await createGroup(),
        await createGroup(),
        await createGroup(),
        await createGroup({ createdAt: new Date('2098-12-31T00:00:00Z') }),
      ];
      const sameDate = ids.slice(1, 4).sort().reverse();
      const expected = [ids[0], ...sameDate, ids[4]];

      const found = await discoverAll(repository, undefined, 2);
      expect(new Set(found).size).toBe(found.length);
      expect(found.filter((id) => ids.includes(id))).toEqual(expected);
    });
  });

  it('finds groups in a city by part of their place, ignoring case', async () => {
    await inRolledBackTransaction(
      async ({ repository, createUser, createGroup }) => {
        const city = `Město${unique()}`;
        const me = await createUser();
        const inCity = await createGroup({ locationName: `${city} 8` });
        const upperCase = await createGroup({
          locationName: city.toUpperCase(),
        });
        const elsewhere = await createGroup({ locationName: 'Jinde' });
        const mine = await createGroup({ locationName: city }, [
          { user: me, role: GroupRole.OWNER },
        ]);

        const found = (await repository.listGroupsInCity(me.id, city, 10)).map(
          (group) => group.id,
        );
        expect(found.sort()).toEqual([inCity, upperCase].sort());
        expect(found).not.toContain(elsewhere);
        expect(found).not.toContain(mine);
      },
    );
  });

  describe("the user's city", () => {
    const NOW = new Date('2099-06-01T00:00:00Z');
    const LATER = new Date('2099-07-01T00:00:00Z');
    const EARLIER = new Date('2099-05-01T00:00:00Z');

    // The CHECKs in the migrations keep each address whole and give a
    // temporary city its end date, so a temporary city can only be blank,
    // never missing.
    it.each([
      ['a valid temporary city', 'Brno', LATER, 'Brno'],
      ['an expired temporary city', 'Brno', EARLIER, 'Praha'],
      ['a valid temporary place with a blank city', '  ', LATER, 'Praha'],
    ])('uses the right city for %s', async (_, temporaryCity, until, city) => {
      await inRolledBackTransaction(async ({ repository, createUser }) => {
        const user = await createUser({
          homeStreet: 'Ulice 1',
          homeCity: 'Praha',
          homePostalCode: '11000',
          homeCountry: 'Česko',
          homeLatitude: 50.08,
          homeLongitude: 14.42,
          temporaryStreet: 'Ulice 2',
          temporaryCity,
          temporaryPostalCode: '60200',
          temporaryCountry: 'Česko',
          temporaryLatitude: 49.19,
          temporaryLongitude: 16.61,
          temporaryLocationValidUntil: until,
        });
        expect(await repository.getUserCity(user.id, NOW)).toBe(city);
      });
    });
  });
});
