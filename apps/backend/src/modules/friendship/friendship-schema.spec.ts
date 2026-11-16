// Database constraints of friendships and friend requests (#227, ADR-0026).
// Like event-schema.spec.ts, the suite needs a real PostgreSQL with the
// migrations applied and only runs on request:
//   DB_TESTS=1 pnpm backend test friendship-schema
//
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { friendPairOf } from '@/modules/friendship/domain/friendship';
import { FriendshipRepository } from '@/modules/friendship/repositories/friendship.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

const unique = (): string => Math.random().toString(36).slice(2);

describeDb('friendship schema constraints', () => {
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

  const createUser = async (
    tx: Prisma.TransactionClient,
    id = `test-${unique()}`,
    data: Partial<Prisma.UserUncheckedCreateInput> = {},
  ): Promise<string> => {
    const now = new Date();
    await tx.user.create({
      data: {
        id,
        name: 'Test User',
        email: `test-${unique()}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        ...data,
      },
    });
    return id;
  };

  it('gives a new user the default visibility for friends', async () => {
    await inRolledBackTransaction(async (tx) => {
      const id = await createUser(tx);
      const user = await tx.user.findUniqueOrThrow({ where: { id } });
      expect(user.friendsSeeEventHistory).toBe(true);
      expect(user.friendsSeeUpcomingEvents).toBe(false);
    });
  });

  describe('friend_request', () => {
    it('accepts a pending request without a decision date', async () => {
      await inRolledBackTransaction(async (tx) => {
        const senderId = await createUser(tx);
        const recipientId = await createUser(tx);
        await tx.friendRequest.create({ data: { senderId, recipientId } });
      });
    });

    it('rejects a request to oneself (friend_request_not_self)', async () => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const id = await createUser(tx);
          await tx.friendRequest.create({
            data: { senderId: id, recipientId: id },
          });
        }),
      ).rejects.toThrow('friend_request_not_self');
    });

    it.each([
      ['PENDING with a decision date', 'PENDING', new Date()],
      ['ACCEPTED without a decision date', 'ACCEPTED', null],
      ['REJECTED without a decision date', 'REJECTED', null],
      ['WITHDRAWN without a decision date', 'WITHDRAWN', null],
    ] as const)(
      'rejects %s (friend_request_decided_at)',
      async (_case, status, decidedAt) => {
        await expect(
          inRolledBackTransaction(async (tx) => {
            const senderId = await createUser(tx);
            const recipientId = await createUser(tx);
            await tx.friendRequest.create({
              data: { senderId, recipientId, status, decidedAt },
            });
          }),
        ).rejects.toThrow('friend_request_decided_at');
      },
    );

    it.each([
      ['the same direction', false],
      ['the opposite direction', true],
    ])('rejects a second pending request in %s', async (_case, isOpposite) => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const a = await createUser(tx);
          const b = await createUser(tx);
          await tx.friendRequest.create({
            data: { senderId: a, recipientId: b },
          });
          await tx.friendRequest.create({
            data: isOpposite
              ? { senderId: b, recipientId: a }
              : { senderId: a, recipientId: b },
          });
        }),
        // Prisma names the columns of the index, not the index
        // friend_request_one_pending_per_pair itself.
      ).rejects.toThrow(/Unique constraint failed/);
    });

    it.each(['REJECTED', 'ACCEPTED', 'WITHDRAWN'] as const)(
      'allows a new pending request after a %s one',
      async (status) => {
        await inRolledBackTransaction(async (tx) => {
          const a = await createUser(tx);
          const b = await createUser(tx);
          await tx.friendRequest.create({
            data: {
              senderId: a,
              recipientId: b,
              status,
              decidedAt: new Date(),
            },
          });
          await tx.friendRequest.create({
            data: { senderId: a, recipientId: b },
          });
        });
      },
    );

    it('is deleted with its sender', async () => {
      await inRolledBackTransaction(async (tx) => {
        const senderId = await createUser(tx);
        const recipientId = await createUser(tx);
        await tx.friendRequest.create({ data: { senderId, recipientId } });
        await tx.user.delete({ where: { id: senderId } });
        expect(await tx.friendRequest.count({ where: { recipientId } })).toBe(
          0,
        );
      });
    });
  });

  describe('friendship', () => {
    // Ids that a locale-aware collation and a byte comparison order
    // differently: the CHECK must agree with friendPairOf either way.
    it.each([
      ['lower-case ids', `a-${unique()}`, `b-${unique()}`],
      ['mixed-case ids', `b-${unique()}`, `B-${unique()}`],
      ['ids with diacritics', `é-${unique()}`, `z-${unique()}`],
      // UTF-16 and the bytes disagree here (see friendPairOf).
      [
        'ids outside the BMP',
        `x-\u{1F600}-${unique()}`,
        `x-\uFFFD-${unique()}`,
      ],
    ])('accepts the pair from friendPairOf for %s', async (_case, x, y) => {
      await inRolledBackTransaction(async (tx) => {
        await createUser(tx, x);
        await createUser(tx, y);
        await tx.friendship.create({ data: friendPairOf(y, x) });
      });
    });

    it('rejects a pair in the wrong order (friendship_ordered_pair)', async () => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const pair = friendPairOf(await createUser(tx), await createUser(tx));
          await tx.friendship.create({
            data: { userAId: pair.userBId, userBId: pair.userAId },
          });
        }),
      ).rejects.toThrow('friendship_ordered_pair');
    });

    it('rejects a friendship with oneself (friendship_ordered_pair)', async () => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const id = await createUser(tx);
          await tx.friendship.create({ data: { userAId: id, userBId: id } });
        }),
      ).rejects.toThrow('friendship_ordered_pair');
    });

    it('rejects a second friendship for the same pair', async () => {
      await expect(
        inRolledBackTransaction(async (tx) => {
          const pair = friendPairOf(await createUser(tx), await createUser(tx));
          await tx.friendship.create({ data: pair });
          await tx.friendship.create({ data: pair });
        }),
      ).rejects.toThrow(/Unique constraint/);
    });

    it('is deleted with either friend', async () => {
      await inRolledBackTransaction(async (tx) => {
        const pair = friendPairOf(await createUser(tx), await createUser(tx));
        await tx.friendship.create({ data: pair });
        await tx.user.delete({ where: { id: pair.userBId } });
        expect(
          await tx.friendship.count({ where: { userAId: pair.userAId } }),
        ).toBe(0);
      });
    });
  });
  // #225: the search query runs on PostgreSQL itself (unaccent, LIKE), so it
  // is checked here. Every name carries a token unique to the case, so other
  // rows in the database never match.
  describe('searchUsers', () => {
    const search = (
      tx: Prisma.TransactionClient,
      viewerId: string,
      text: string,
    ): Promise<string[]> =>
      new FriendshipRepository(tx as unknown as PrismaService)
        .searchUsers(viewerId, text, 0, 50)
        .then((rows) => rows.map((row) => row.name));

    it('finds a part of the name, whatever the case and the diacritics', async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = unique();
        const viewer = await createUser(tx);
        await createUser(tx, undefined, { name: `Šimon Nováček ${token}` });
        expect(await search(tx, viewer, `simon novacek ${token}`)).toEqual([
          `Šimon Nováček ${token}`,
        ]);
        expect(await search(tx, viewer, `ÁČEK ${token.toUpperCase()}`)).toEqual(
          [`Šimon Nováček ${token}`],
        );
      });
    });

    it('finds the username, and returns the one typed at sign-up', async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = unique();
        const viewer = await createUser(tx);
        await createUser(tx, undefined, {
          name: 'Libor',
          username: `novyhrac${token}`,
          displayUsername: `NovyHrac${token}`,
        });
        const rows = await new FriendshipRepository(
          tx as unknown as PrismaService,
        ).searchUsers(viewer, `hrac${token}`, 0, 50);
        expect(rows).toEqual([
          expect.objectContaining({
            name: 'Libor',
            nickname: `NovyHrac${token}`,
          }),
        ]);
        expect(Object.keys(rows[0]).sort()).toEqual([
          'id',
          'image',
          'name',
          'nickname',
        ]);
      });
    });

    it('never finds anybody by the e-mail', async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = unique();
        const viewer = await createUser(tx);
        await createUser(tx, undefined, {
          name: 'Libor',
          email: `libor-${token}@example.com`,
        });
        expect(await search(tx, viewer, `libor-${token}@example.com`)).toEqual(
          [],
        );
        expect(await search(tx, viewer, `${token}@example`)).toEqual([]);
      });
    });

    it('leaves out the viewer and blocked or deleted accounts', async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = unique();
        const viewer = await createUser(tx, undefined, { name: `Me ${token}` });
        for (const status of [
          'ACTIVE',
          'RESTRICTED',
          'BLOCKED',
          'DELETED',
        ] as const) {
          await createUser(tx, undefined, {
            name: `${status} ${token}`,
            status,
          });
        }
        expect((await search(tx, viewer, token)).sort()).toEqual([
          `ACTIVE ${token}`,
          `RESTRICTED ${token}`,
        ]);
      });
    });

    // #239: the service hands over the people blocked from the viewer.
    it('leaves out the people it is told to', async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = unique();
        const viewer = await createUser(tx);
        const shown = await createUser(tx, undefined, {
          name: `Shown ${token}`,
        });
        const blocked = await createUser(tx, undefined, {
          name: `Blocked ${token}`,
        });
        const rows = await new FriendshipRepository(
          tx as unknown as PrismaService,
        ).searchUsers(viewer, token, 0, 50, [blocked]);
        expect(rows.map((row) => row.id)).toEqual([shown]);
      });
    });

    it('takes % and _ as typed, not as wildcards', async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = unique();
        const viewer = await createUser(tx);
        await createUser(tx, undefined, { name: `Ana ${token}` });
        await createUser(tx, undefined, { name: `A_a ${token}` });
        expect(await search(tx, viewer, `a_a ${token}`)).toEqual([
          `A_a ${token}`,
        ]);
        expect(await search(tx, viewer, `%${token}`)).toEqual([]);
      });
    });
  });

  // #225: withdrawing and counting requests run on the database itself.
  describe('withdrawPendingRequest and countRequestsSince', () => {
    const repositoryOf = (tx: Prisma.TransactionClient): FriendshipRepository =>
      new FriendshipRepository(tx as unknown as PrismaService);

    it('withdraws only my pending request, never one sent to me', async () => {
      await inRolledBackTransaction(async (tx) => {
        const me = await createUser(tx);
        const other = await createUser(tx);
        await tx.friendRequest.create({
          data: { senderId: other, recipientId: me },
        });
        const repository = repositoryOf(tx);
        await expect(
          repository.withdrawPendingRequest(me, other, new Date()),
        ).resolves.toBe(false);
        expect(
          await tx.friendRequest.findFirstOrThrow({
            where: { senderId: other },
          }),
        ).toMatchObject({ status: 'PENDING', decidedAt: null });
      });
    });

    it('withdraws my pending request, which then stops no new one', async () => {
      await inRolledBackTransaction(async (tx) => {
        const me = await createUser(tx);
        const other = await createUser(tx);
        await tx.friendRequest.create({
          data: { senderId: me, recipientId: other },
        });
        const repository = repositoryOf(tx);
        const now = new Date();
        await expect(
          repository.withdrawPendingRequest(me, other, now),
        ).resolves.toBe(true);
        expect(
          await tx.friendRequest.findFirstOrThrow({ where: { senderId: me } }),
        ).toMatchObject({ status: 'WITHDRAWN', decidedAt: now });
        await repository.createRequest(me, other);
      });
    });

    it('counts every request of the sender to the recipient since then', async () => {
      await inRolledBackTransaction(async (tx) => {
        const me = await createUser(tx);
        const other = await createUser(tx);
        const third = await createUser(tx);
        const decided = { decidedAt: new Date() };
        await tx.friendRequest.createMany({
          data: [
            {
              senderId: me,
              recipientId: other,
              status: 'WITHDRAWN',
              ...decided,
            },
            {
              senderId: me,
              recipientId: other,
              status: 'REJECTED',
              ...decided,
            },
            {
              senderId: me,
              recipientId: other,
              status: 'WITHDRAWN',
              requestedAt: new Date('2020-01-01T00:00:00Z'),
              ...decided,
            },
            { senderId: other, recipientId: me },
            { senderId: me, recipientId: third },
          ],
        });
        await expect(
          repositoryOf(tx).countRequestsSince(
            me,
            other,
            new Date(Date.now() - 60 * 60 * 1000),
          ),
        ).resolves.toBe(2);
      });
    });
  });

  // #239, ADR-0022, ADR-0026: blocking a pair ends what ties them together.
  describe('removeBlockedPair', () => {
    // The repository opens its own transaction; inside the rolled back one of
    // the test it runs in that one instead.
    const repositoryOf = (tx: Prisma.TransactionClient): FriendshipRepository =>
      new FriendshipRepository(
        new Proxy(tx, {
          get: (target, key, receiver): unknown =>
            key === '$transaction'
              ? (work: Promise<unknown>[]): Promise<unknown[]> =>
                  Promise.all(work)
              : Reflect.get(target, key, receiver),
        }) as unknown as PrismaService,
      );

    it('ends the friendship and closes the pending requests of the pair only', async () => {
      await inRolledBackTransaction(async (tx) => {
        const a = await createUser(tx);
        const b = await createUser(tx);
        const c = await createUser(tx);
        await tx.friendship.create({ data: friendPairOf(a, b) });
        await tx.friendship.create({ data: friendPairOf(a, c) });
        const accepted = await tx.friendRequest.create({
          data: {
            senderId: b,
            recipientId: a,
            status: 'ACCEPTED',
            decidedAt: new Date('2030-01-01T10:00:00Z'),
          },
        });
        // One request still pending inside the pair, one from outside it.
        const pending = await tx.friendRequest.create({
          data: { senderId: a, recipientId: b },
        });
        const other = await tx.friendRequest.create({
          data: { senderId: c, recipientId: b },
        });
        const now = new Date('2030-01-01T12:00:00Z');

        await repositoryOf(tx).removeBlockedPair(b, a, now);

        await expect(
          tx.friendship.count({ where: friendPairOf(a, b) }),
        ).resolves.toBe(0);
        await expect(
          tx.friendship.count({ where: friendPairOf(a, c) }),
        ).resolves.toBe(1);
        // Kept, never deleted: the pending one ends silently as REJECTED.
        expect(
          await tx.friendRequest.findUniqueOrThrow({
            where: { id: pending.id },
          }),
        ).toMatchObject({ status: 'REJECTED', decidedAt: now });
        expect(
          await tx.friendRequest.findUniqueOrThrow({
            where: { id: accepted.id },
          }),
        ).toMatchObject({ status: 'ACCEPTED' });
        expect(
          await tx.friendRequest.findUniqueOrThrow({ where: { id: other.id } }),
        ).toMatchObject({ status: 'PENDING' });

        // Running it again changes nothing.
        await repositoryOf(tx).removeBlockedPair(a, b, now);
      });
    });
  });
});
