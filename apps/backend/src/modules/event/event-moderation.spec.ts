// #239, ADR-0022: an administrator hides an event and brings it back; the
// audit log records it in the same transaction, and the database keeps the
// rules of hiding and of user blocks. Against a real PostgreSQL, on request:
//   DB_TESTS=1 pnpm backend test event-moderation
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  VenueType,
} from '@/generated/prisma/client';
import { EventRepository } from './repositories/event.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

const REASON = 'Akce nabízí placené služby.';

describeDb('event moderation in the database (#239)', () => {
  const prisma = new PrismaService();
  const repository = new EventRepository(prisma);
  const now = new Date('2029-12-31T10:00:00Z');
  const created = {
    eventIds: [] as string[],
    userIds: [] as string[],
    categoryIds: [] as string[],
    adminIds: [] as string[],
  };

  afterEach(async () => {
    await prisma.auditLogEntry.deleteMany({
      where: { adminId: { in: created.adminIds } },
    });
    await prisma.userBlock.deleteMany({
      where: { blockerId: { in: created.userIds } },
    });
    await prisma.event.deleteMany({ where: { id: { in: created.eventIds } } });
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
    created.eventIds = [];
    created.userIds = [];
    created.categoryIds = [];
    created.adminIds = [];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const random = (): string => Math.random().toString(36).slice(2);

  const aUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        id: `test-${random()}`,
        name: 'Test',
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

  const anEvent = async (
    organizerId: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
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
    const start = new Date(Date.UTC(2030, 0, 10, 18));
    const event = await prisma.event.create({
      data: {
        title: 'Test',
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
        activityId: activity.id,
        organizerId,
        ...extra,
      },
    });
    created.eventIds.push(event.id);
    return event.id;
  };

  describe('setHidden', () => {
    it('hides the event with who, when and why, and records it', async () => {
      const [adminId, eventId] = [
        await anAdministrator(),
        await anEvent(await aUser()),
      ];

      const event = await repository.setHidden(eventId, {
        kind: 'HIDE',
        adminId,
        reason: REASON,
        at: now,
      });

      expect(event).toMatchObject({ isHidden: true, hiddenReason: REASON });
      await expect(
        prisma.event.findUniqueOrThrow({ where: { id: eventId } }),
      ).resolves.toMatchObject({ hiddenAt: now, hiddenById: adminId });
      await expect(
        prisma.auditLogEntry.findMany({ where: { targetId: eventId } }),
      ).resolves.toEqual([
        expect.objectContaining({
          adminId,
          action: 'EVENT_HIDDEN',
          targetType: 'EVENT',
          description: REASON,
        }),
      ]);
    });

    it('does nothing, and records nothing, for an event already hidden', async () => {
      const adminId = await anAdministrator();
      const eventId = await anEvent(await aUser());
      const hide = { kind: 'HIDE', adminId, reason: REASON, at: now } as const;
      await repository.setHidden(eventId, hide);

      await expect(repository.setHidden(eventId, hide)).resolves.toBeNull();
      await expect(
        prisma.auditLogEntry.count({ where: { targetId: eventId } }),
      ).resolves.toBe(1);
    });

    it('does not hide a draft', async () => {
      const adminId = await anAdministrator();
      const eventId = await anEvent(await aUser(), {
        status: EventStatus.DRAFT,
      });

      await expect(
        repository.setHidden(eventId, {
          kind: 'HIDE',
          adminId,
          reason: REASON,
          at: now,
        }),
      ).resolves.toBeNull();
    });

    it('brings the event back and clears who, when and why', async () => {
      const adminId = await anAdministrator();
      const eventId = await anEvent(await aUser());
      await repository.setHidden(eventId, {
        kind: 'HIDE',
        adminId,
        reason: REASON,
        at: now,
      });

      const event = await repository.setHidden(eventId, {
        kind: 'RESTORE',
        adminId,
      });

      expect(event).toMatchObject({ isHidden: false, hiddenReason: null });
      await expect(
        prisma.event.findUniqueOrThrow({ where: { id: eventId } }),
      ).resolves.toMatchObject({ hiddenAt: null, hiddenById: null });
      await expect(
        prisma.auditLogEntry.findMany({
          where: { targetId: eventId },
          orderBy: { createdAt: 'asc' },
          select: { action: true },
        }),
      ).resolves.toEqual([
        { action: 'EVENT_HIDDEN' },
        { action: 'EVENT_RESTORED' },
      ]);
    });
  });

  it('gives the hidden detail with the reason, and no public detail', async () => {
    const adminId = await anAdministrator();
    const eventId = await anEvent(await aUser());
    await repository.setHidden(eventId, {
      kind: 'HIDE',
      adminId,
      reason: REASON,
      at: now,
    });

    await expect(repository.getShowableEventById(eventId)).resolves.toBeNull();
    await expect(
      repository.getHiddenEventDetail(eventId),
    ).resolves.toMatchObject({ id: eventId, hiddenReason: REASON });
  });

  it('gives a visible event no hidden detail and no reason', async () => {
    const eventId = await anEvent(await aUser());

    await expect(repository.getHiddenEventDetail(eventId)).resolves.toBeNull();
    await expect(
      repository.getShowableEventById(eventId),
    ).resolves.toMatchObject({ id: eventId, hiddenReason: null });
  });

  describe('the rules the database keeps', () => {
    it.each([
      ['hidden without a reason', { isHidden: true, hiddenAt: now }],
      [
        'a reason without being hidden',
        { hiddenReason: REASON, hiddenAt: now },
      ],
      [
        'a reason under 10 characters',
        { isHidden: true, hiddenAt: now, hiddenReason: 'Spam' },
      ],
    ])('refuses an event %s', async (_case, extra) => {
      await expect(anEvent(await aUser(), extra)).rejects.toThrow();
    });

    const aBlock = async (data: Record<string, unknown>): Promise<void> => {
      await prisma.userBlock.create({
        data: data as Parameters<typeof prisma.userBlock.create>[0]['data'],
      });
    };

    it('stores a block by an administrator once, smaller id first', async () => {
      const adminId = await anAdministrator();
      const [a, b] = [await aUser(), await aUser()].sort();

      await aBlock({
        blockerId: a,
        blockedId: b,
        createdById: adminId,
        reason: REASON,
      });

      await expect(
        aBlock({
          blockerId: b,
          blockedId: a,
          createdById: adminId,
          reason: REASON,
        }),
      ).rejects.toThrow();
    });

    it.each([
      ['a block of oneself', 'self'],
      ['a block by an administrator without a reason', 'noReason'],
      ['a reason on a block by a user', 'userReason'],
    ] as const)('refuses %s', async (_case, kind) => {
      const adminId = await anAdministrator();
      const [a, b] = [await aUser(), await aUser()].sort();
      const data = {
        self: { blockerId: a, blockedId: a },
        noReason: { blockerId: a, blockedId: b, createdById: adminId },
        userReason: { blockerId: a, blockedId: b, reason: REASON },
      }[kind];

      await expect(aBlock(data)).rejects.toThrow();
    });
  });
});
