// #239, ADR-0022: blocks between two people against a real PostgreSQL: who is
// hidden from whom, the block with its audit entries, the quiet undoing of
// what ties the two together, and the filters the lists use. On request:
//   DB_TESTS=1 pnpm backend test user-block-db
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  GroupRole,
  ParticipationStatus,
  RequestStatus,
  VenueType,
} from '@/generated/prisma/client';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { MembershipRequestRepository } from '@/modules/membership-request/repositories/membership-request.repository';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { ParticipationRequestRepository } from '@/modules/participation-request/repositories/participation-request.repository';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { UserBlockRepository } from './repositories/user-block.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

const REASON = 'Opakované obtěžování po akci.';

describeDb('blocks between two people in the database (#239)', () => {
  const prisma = new PrismaService();
  const blocks = new UserBlockRepository(prisma);
  const visibility = new UserBlockVisibility(prisma);
  const events = new EventRepository(prisma);
  const participations = new ParticipationRequestRepository(prisma);
  const memberships = new MembershipRequestRepository(prisma);
  const groups = new GroupRepository(prisma);
  const notifications = new NotificationRepository(prisma);
  const now = new Date('2029-12-31T10:00:00Z');
  const created = {
    userIds: [] as string[],
    adminIds: [] as string[],
    eventIds: [] as string[],
    groupIds: [] as string[],
    categoryIds: [] as string[],
  };

  afterEach(async () => {
    await prisma.auditLogEntry.deleteMany({
      where: { adminId: { in: created.adminIds } },
    });
    await prisma.userBlock.deleteMany({
      where: { blockerId: { in: created.userIds } },
    });
    await prisma.event.deleteMany({ where: { id: { in: created.eventIds } } });
    await prisma.group.deleteMany({ where: { id: { in: created.groupIds } } });
    await prisma.user.deleteMany({ where: { id: { in: created.userIds } } });
    await prisma.administrator.deleteMany({
      where: { id: { in: created.adminIds } },
    });
    await prisma.activity.deleteMany({
      where: { categoryId: { in: created.categoryIds } },
    });
    await prisma.activityCategory.deleteMany({
      where: { id: { in: created.categoryIds } },
    });
    for (const list of Object.values(created)) list.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const random = (): string => Math.random().toString(36).slice(2);

  const aUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        id: `test-${random()}`,
        name: `Test ${random()}`,
        email: `test-${random()}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    created.userIds.push(user.id);
    return user.id;
  };

  const anAdministrator = async (): Promise<string> => {
    const admin = await prisma.administrator.create({
      data: {
        id: `test-admin-${random()}`,
        name: 'Správce',
        email: `admin-${random()}@example.com`,
        createdAt: now,
        updatedAt: now,
      },
    });
    created.adminIds.push(admin.id);
    return admin.id;
  };

  const anActivity = async (): Promise<string> => {
    const category = await prisma.activityCategory.create({
      data: {
        name: `cat-${random()}`,
        icon: `cat-${random()}`,
        order: Math.floor(Math.random() * 2_000_000_000),
      },
    });
    created.categoryIds.push(category.id);
    const activity = await prisma.activity.create({
      data: {
        name: `act-${random()}`,
        icon: 'florbal',
        categoryId: category.id,
        defaultMinParticipants: 2,
        defaultMaxParticipants: 4,
      },
    });
    return activity.id;
  };

  const anEvent = async (
    organizerId: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    const start = new Date(Date.UTC(2030, 0, 10, 18));
    const event = await prisma.event.create({
      data: {
        title: `Test ${random()}`,
        description: 'Test',
        status: EventStatus.PUBLISHED,
        approvalMode: ApprovalMode.MANUAL,
        venueType: VenueType.PUBLIC_VENUE,
        startAt: start,
        endAt: new Date(start.getTime() + 2 * 3600 * 1000),
        minParticipants: 2,
        maxParticipants: 4,
        locationStreet: 'Ulice 1',
        locationCity: 'Praha',
        locationPostalCode: '11000',
        locationCountry: 'Česko',
        activityId: await anActivity(),
        organizerId,
        ...extra,
      },
    });
    created.eventIds.push(event.id);
    return event.id;
  };

  const aGroup = async (members: [string, GroupRole][]): Promise<string> => {
    const group = await prisma.group.create({
      data: {
        name: `Skupina ${random()}`,
        description: 'Test',
        activityId: await anActivity(),
        memberships: {
          create: members.map(([userId, role]) => ({ userId, role })),
        },
      },
    });
    created.groupIds.push(group.id);
    return group.id;
  };

  const blockPair = async (a: string, b: string): Promise<void> => {
    await blocks.createAdminBlock({
      a,
      b,
      adminId: await anAdministrator(),
      reason: REASON,
    });
  };

  describe('who is hidden from whom', () => {
    it('hides both people of a block by an administrator from each other', async () => {
      const [a, b, other] = [await aUser(), await aUser(), await aUser()];
      await blockPair(a, b);

      await expect(visibility.hiddenFor(a)).resolves.toEqual([b]);
      await expect(visibility.hiddenFor(b)).resolves.toEqual([a]);
      await expect(visibility.hiddenFrom(a)).resolves.toEqual([b]);
      await expect(visibility.hiddenFor(other)).resolves.toEqual([]);
      await expect(visibility.hiddenFor(undefined)).resolves.toEqual([]);
    });

    it('hides a blocker by a user (#65) from the blocked only', async () => {
      const [blocker, blocked] = [await aUser(), await aUser()];
      await prisma.userBlock.create({
        data: { blockerId: blocker, blockedId: blocked },
      });

      await expect(visibility.hiddenFor(blocked)).resolves.toEqual([blocker]);
      await expect(visibility.hiddenFor(blocker)).resolves.toEqual([]);
      await expect(visibility.hiddenFrom(blocker)).resolves.toEqual([blocked]);
    });
  });

  describe('the block itself', () => {
    it('is stored once, whichever side it comes from, with audit entries for both', async () => {
      const [a, b] = [await aUser(), await aUser()];
      const adminId = await anAdministrator();

      await expect(
        blocks.createAdminBlock({ a: b, b: a, adminId, reason: REASON }),
      ).resolves.toBe(true);
      await expect(
        blocks.createAdminBlock({ a, b, adminId, reason: REASON }),
      ).resolves.toBe(false);

      await expect(
        prisma.userBlock.count({
          where: { OR: [{ blockerId: a }, { blockerId: b }] },
        }),
      ).resolves.toBe(1);
      const entries = await prisma.auditLogEntry.findMany({
        where: { adminId },
        select: { action: true, targetId: true },
      });
      expect(entries).toEqual(
        expect.arrayContaining([
          { action: 'USERS_BLOCKED', targetId: a },
          { action: 'USERS_BLOCKED', targetId: b },
        ]),
      );
      expect(entries).toHaveLength(2);
    });

    it('is listed on the detail of either person with the other one', async () => {
      const [a, b] = [await aUser(), await aUser()];
      await blockPair(a, b);

      await expect(blocks.listAdminBlocksOf(a)).resolves.toEqual([
        expect.objectContaining({
          otherUser: expect.objectContaining({ id: b }),
          reason: REASON,
          createdBy: expect.objectContaining({ name: 'Správce' }),
        }),
      ]);
      await expect(blocks.listAdminBlocksOf(b)).resolves.toEqual([
        expect.objectContaining({
          otherUser: expect.objectContaining({ id: a }),
        }),
      ]);
    });

    it('ends, with an audit entry, and only once', async () => {
      const [a, b] = [await aUser(), await aUser()];
      const adminId = await anAdministrator();
      await blocks.createAdminBlock({ a, b, adminId, reason: REASON });

      await expect(
        blocks.deleteAdminBlock({ a: b, b: a, adminId }),
      ).resolves.toBe(true);
      await expect(blocks.deleteAdminBlock({ a, b, adminId })).resolves.toBe(
        false,
      );
      await expect(visibility.hiddenFor(a)).resolves.toEqual([]);
      await expect(
        prisma.auditLogEntry.count({
          where: { adminId, action: 'USERS_UNBLOCKED' },
        }),
      ).resolves.toBe(2);
    });
  });

  describe('undoing what ties the two together', () => {
    it('closes requests and cancels seats on events one of them runs', async () => {
      const [organizer, participant, other] = [
        await aUser(),
        await aUser(),
        await aUser(),
      ];
      const seated = await anEvent(organizer, {
        participations: {
          create: [
            { userId: participant, status: ParticipationStatus.APPROVED },
            { userId: other, status: ParticipationStatus.APPROVED },
          ],
        },
      });
      const asked = await anEvent(organizer, {
        participationRequests: {
          create: { userId: participant, status: RequestStatus.PENDING },
        },
      });
      const coOrganized = await anEvent(await aUser(), {
        coOrganizers: { connect: { id: organizer } },
        participations: {
          create: {
            userId: participant,
            status: ParticipationStatus.WAITLISTED,
            waitlistPosition: 1,
          },
        },
      });
      const past = await anEvent(organizer, {
        startAt: new Date('2029-12-01T18:00:00Z'),
        endAt: new Date('2029-12-01T20:00:00Z'),
        participations: {
          create: { userId: participant, status: ParticipationStatus.APPROVED },
        },
      });

      await participations.detachBlockedPair(participant, organizer, now);

      const seat = (eventId: string, userId: string): Promise<unknown> =>
        prisma.participation.findUniqueOrThrow({
          where: { eventId_userId: { eventId, userId } },
        });
      await expect(seat(seated, participant)).resolves.toMatchObject({
        status: ParticipationStatus.CANCELLED,
        cancelledAt: now,
        cancellationMessage: null,
      });
      await expect(seat(coOrganized, participant)).resolves.toMatchObject({
        status: ParticipationStatus.CANCELLED,
        waitlistPosition: null,
      });
      // Someone else on the same event, and an event that is over, stay.
      await expect(seat(seated, other)).resolves.toMatchObject({
        status: ParticipationStatus.APPROVED,
      });
      await expect(seat(past, participant)).resolves.toMatchObject({
        status: ParticipationStatus.APPROVED,
      });
      await expect(
        prisma.participationRequest.findFirstOrThrow({
          where: { eventId: asked, userId: participant },
        }),
      ).resolves.toMatchObject({
        status: RequestStatus.CLOSED,
        decidedAt: now,
      });
    });

    it('closes requests to, and ends plain membership in, groups one of them runs', async () => {
      const [owner, admin, member, applicant] = [
        await aUser(),
        await aUser(),
        await aUser(),
        await aUser(),
      ];
      const group = await aGroup([
        [owner, GroupRole.OWNER],
        [admin, GroupRole.ADMIN],
        [member, GroupRole.MEMBER],
      ]);
      await prisma.membershipRequest.create({
        data: { groupId: group, userId: applicant },
      });

      await groups.removeBlockedPair(member, owner);
      await groups.removeBlockedPair(admin, owner);
      await memberships.closeBlockedPair(applicant, admin, now);

      await expect(groups.getMemberRole(group, member)).resolves.toBeNull();
      // Two who both run the group both stay.
      await expect(groups.getMemberRole(group, admin)).resolves.toBe(
        GroupRole.ADMIN,
      );
      await expect(
        prisma.membershipRequest.findFirstOrThrow({
          where: { groupId: group, userId: applicant },
        }),
      ).resolves.toMatchObject({ status: RequestStatus.CLOSED });
    });
  });

  describe('the lists', () => {
    it('leave out the events the hidden people organize or co-organize', async () => {
      const [blocked, other] = [await aUser(), await aUser()];
      const tag = random();
      await anEvent(blocked, { title: `Blokovaný ${tag}` });
      await anEvent(other, {
        title: `Spolupořádá ${tag}`,
        coOrganizers: { connect: { id: blocked } },
      });
      const fine = await anEvent(other, { title: `Jiná ${tag}` });

      const page = await events.getUpcomingPublicEvents(
        now,
        { limit: 50, offset: 0 },
        { activityIds: [], search: tag, hiddenOrganizerIds: [blocked] },
      );

      expect(page.items.map((item) => item.id)).toEqual([fine]);
    });

    it('leave the hidden people off the member list', async () => {
      const [owner, blocked] = [await aUser(), await aUser()];
      const group = await aGroup([
        [owner, GroupRole.OWNER],
        [blocked, GroupRole.MEMBER],
      ]);

      const members = await groups.listMembers(group, [blocked]);

      expect(members.map((member) => member.userId)).toEqual([owner]);
    });

    it('keep the notifications without an actor in the bell', async () => {
      const [recipient, blocked] = [await aUser(), await aUser()];
      await prisma.notification.createMany({
        data: [
          { recipientId: recipient, type: 'EVENT_HIDDEN', actorId: null },
          { recipientId: recipient, type: 'NEW_REQUESTS', actorId: blocked },
        ],
      });

      const page = await notifications.listOf(
        recipient,
        { limit: 10, offset: 0 },
        {},
        [blocked],
      );

      expect(page.items.map((item) => item.type)).toEqual(['EVENT_HIDDEN']);
      await expect(
        notifications.countUnread(recipient, [blocked]),
      ).resolves.toBe(1);
    });
  });
});
