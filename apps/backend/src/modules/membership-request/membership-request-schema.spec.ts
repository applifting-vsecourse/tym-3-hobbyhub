// Database rules of a request to join a group (F-07.3, ADR-0008): the
// constraints of the migration, and the repository's approval, which writes
// the request and the membership together. Like the other schema specs they
// need a real PostgreSQL with the migrations applied, so the suite only runs
// on request:
//   DB_TESTS=1 pnpm backend test membership-request-schema
//
// Every case runs in a transaction that is rolled back.
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GroupRole,
  MembershipRequest,
  Prisma,
  RequestStatus,
} from '@/generated/prisma/client';
import { MembershipRequestRepository } from './repositories/membership-request.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

class Rollback extends Error {}

const random = (): string => Math.random().toString(36).slice(2);

describeDb('membership request database rules', () => {
  const prisma = new PrismaService();
  const at = new Date('2030-01-01T12:00:00Z');

  afterAll(async () => {
    await prisma.$disconnect();
  });

  type Fixture = {
    tx: Prisma.TransactionClient;
    groupId: string;
    applicantId: string;
  };

  // A group with its owner, and someone outside it.
  const inRolledBackTransaction = async (
    work: (fixture: Fixture) => Promise<unknown>,
  ): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        const now = new Date();
        const [owner, applicant] = await Promise.all(
          ['Organizátor', 'Žadatel'].map((name) =>
            tx.user.create({
              data: {
                id: `test-${random()}`,
                name,
                email: `test-${random()}@example.com`,
                emailVerified: true,
                createdAt: now,
                updatedAt: now,
              },
            }),
          ),
        );
        const category = await tx.activityCategory.create({
          data: { name: `cat-${random()}` },
        });
        const activity = await tx.activity.create({
          data: {
            name: `act-${random()}`,
            icon: 'florbal',
            categoryId: category.id,
            defaultMinParticipants: 2,
            defaultMaxParticipants: 10,
          },
        });
        const group = await tx.group.create({
          data: {
            name: `group-${random()}`,
            description: 'Test',
            activityId: activity.id,
            memberships: {
              create: { userId: owner.id, role: GroupRole.OWNER },
            },
          },
        });
        await work({ tx, groupId: group.id, applicantId: applicant.id });
        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  };

  const createRequest = (
    { tx, groupId, applicantId }: Fixture,
    data: Partial<Prisma.MembershipRequestUncheckedCreateInput> = {},
  ): Promise<MembershipRequest> =>
    tx.membershipRequest.create({
      data: { groupId, userId: applicantId, ...data },
    });

  // A failed statement aborts the transaction, so each refusal is checked in
  // a savepoint of its own.
  const expectRefused = async (
    tx: Prisma.TransactionClient,
    write: () => Promise<unknown>,
    constraint: string,
  ): Promise<void> => {
    await tx.$executeRawUnsafe('SAVEPOINT refused');
    await expect(write()).rejects.toThrow(constraint);
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT refused');
  };

  it('keeps one waiting request per person and group', async () => {
    await inRolledBackTransaction(async (fixture) => {
      await createRequest(fixture);
      await expectRefused(
        fixture.tx,
        () => createRequest(fixture),
        'Unique constraint',
      );
      // Ended requests are history: a withdrawn one leaves room for another.
      await fixture.tx.membershipRequest.updateMany({
        where: { groupId: fixture.groupId },
        data: { status: RequestStatus.WITHDRAWN, decidedAt: at },
      });
      await createRequest(fixture);
    });
  });

  it('dates the decision of every request that no longer waits', async () => {
    await inRolledBackTransaction(async (fixture) => {
      await expectRefused(
        fixture.tx,
        () => createRequest(fixture, { decidedAt: at }),
        'membership_request_decided_at_with_status',
      );
      await expectRefused(
        fixture.tx,
        () => createRequest(fixture, { status: RequestStatus.REJECTED }),
        'membership_request_decided_at_with_status',
      );
    });
  });

  it('keeps a reason for rejections only, and never blank', async () => {
    await inRolledBackTransaction(async (fixture) => {
      await expectRefused(
        fixture.tx,
        () =>
          createRequest(fixture, {
            status: RequestStatus.APPROVED,
            decidedAt: at,
            rejectionReason: 'Plno',
          }),
        'membership_request_rejection_reason_only_rejected',
      );
      await expectRefused(
        fixture.tx,
        () =>
          createRequest(fixture, {
            status: RequestStatus.REJECTED,
            decidedAt: at,
            rejectionReason: '\n\t ',
          }),
        'membership_request_rejection_reason_not_blank',
      );
      await expectRefused(
        fixture.tx,
        () => createRequest(fixture, { message: ' 　\n' }),
        'membership_request_message_not_blank',
      );
    });
  });

  // The approval runs its own transaction, so these cases write for real and
  // delete what they created afterwards.
  describe('MembershipRequestRepository', () => {
    const repository = new MembershipRequestRepository(prisma);
    const created = { userIds: [] as string[], categoryIds: [] as string[] };

    afterEach(async () => {
      // Groups first: their memberships and requests go with them, and then
      // nothing holds the users and the activity.
      await prisma.group.deleteMany({
        where: { activity: { categoryId: { in: created.categoryIds } } },
      });
      await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
      await prisma.activity.deleteMany({
        where: { categoryId: { in: created.categoryIds } },
      });
      await prisma.activityCategory.deleteMany({
        where: { id: { in: created.categoryIds } },
      });
      created.userIds = [];
      created.categoryIds = [];
    });

    // A group with its owner, someone outside it, and their waiting request.
    const waitingRequest = async (
      message?: string,
    ): Promise<{ groupId: string; applicantId: string; requestId: string }> => {
      const now = new Date();
      const [owner, applicant] = await Promise.all(
        ['Organizátor', 'Žadatel'].map((name) =>
          prisma.user.create({
            data: {
              id: `test-${random()}`,
              name,
              email: `test-${random()}@example.com`,
              emailVerified: true,
              createdAt: now,
              updatedAt: now,
            },
          }),
        ),
      );
      created.userIds.push(owner.id, applicant.id);
      const category = await prisma.activityCategory.create({
        data: { name: `cat-${random()}` },
      });
      created.categoryIds.push(category.id);
      const activity = await prisma.activity.create({
        data: {
          name: `act-${random()}`,
          icon: 'florbal',
          categoryId: category.id,
          defaultMinParticipants: 2,
          defaultMaxParticipants: 10,
        },
      });
      const group = await prisma.group.create({
        data: {
          name: `group-${random()}`,
          description: 'Test',
          activityId: activity.id,
          memberships: { create: { userId: owner.id, role: GroupRole.OWNER } },
        },
      });
      const request = await prisma.membershipRequest.create({
        data: { groupId: group.id, userId: applicant.id, message },
      });
      return {
        groupId: group.id,
        applicantId: applicant.id,
        requestId: request.id,
      };
    };

    it('approves a waiting request and makes the applicant a member', async () => {
      const { groupId, applicantId, requestId } = await waitingRequest();

      const approved = await repository.approvePending({
        groupId,
        requestId,
        at,
      });

      expect(approved).toMatchObject({ status: 'APPROVED', decidedAt: at });
      const membership = await prisma.groupMembership.findUnique({
        where: { groupId_userId: { groupId, userId: applicantId } },
      });
      expect(membership).toMatchObject({ role: 'MEMBER', joinedAt: at });
      expect(await prisma.groupMembership.count({ where: { groupId } })).toBe(
        2,
      );
    });

    it('approves only once when two admins click at the same moment', async () => {
      const { groupId, requestId } = await waitingRequest();

      const results = await Promise.all([
        repository.approvePending({ groupId, requestId, at }),
        repository.approvePending({ groupId, requestId, at }),
      ]);

      expect(results.filter((result) => result === 'NOT_PENDING')).toHaveLength(
        1,
      );
      expect(await prisma.groupMembership.count({ where: { groupId } })).toBe(
        2,
      );
    });

    it('decides a request only once', async () => {
      const { groupId, requestId } = await waitingRequest();
      await repository.approvePending({ groupId, requestId, at });

      await expect(
        repository.approvePending({ groupId, requestId, at }),
      ).resolves.toBe('NOT_PENDING');
      await expect(
        repository.rejectPending({ groupId, requestId, at }),
      ).resolves.toBeNull();
    });

    it('rolls the approval back when the applicant is a member already', async () => {
      const { groupId, applicantId, requestId } = await waitingRequest();
      await prisma.groupMembership.create({
        data: { groupId, userId: applicantId },
      });

      await expect(
        repository.approvePending({ groupId, requestId, at }),
      ).resolves.toBe('APPLICANT_IS_MEMBER');
      const request = await prisma.membershipRequest.findUniqueOrThrow({
        where: { id: requestId },
      });
      expect(request.status).toBe('PENDING');
    });

    it('does not decide a request of another group', async () => {
      const { requestId } = await waitingRequest();

      await expect(
        repository.approvePending({ groupId: 'another', requestId, at }),
      ).resolves.toBe('NOT_PENDING');
      await expect(
        repository.rejectPending({ groupId: 'another', requestId, at }),
      ).resolves.toBeNull();
    });

    it('rejects with the reason and leaves the applicant outside', async () => {
      const { groupId, applicantId, requestId } = await waitingRequest();

      const rejected = await repository.rejectPending({
        groupId,
        requestId,
        reason: 'Plno',
        at,
      });

      expect(rejected).toMatchObject({
        status: 'REJECTED',
        rejectionReason: 'Plno',
        decidedAt: at,
      });
      expect(
        await prisma.groupMembership.findUnique({
          where: { groupId_userId: { groupId, userId: applicantId } },
        }),
      ).toBeNull();
    });

    it('lists waiting requests with what admins may see', async () => {
      const { groupId, requestId } = await waitingRequest('Ahoj');

      await expect(repository.getPendingRequests(groupId)).resolves.toEqual([
        expect.objectContaining({
          id: requestId,
          message: 'Ahoj',
          applicant: {
            name: 'Žadatel',
            image: null,
            bio: null,
            hasVerifiedEmail: true,
          },
        }),
      ]);
    });
  });
});
