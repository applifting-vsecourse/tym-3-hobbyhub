// #240, ADR-0023: the queue of reports against a real PostgreSQL: one open
// report per reporter and target, the counts the queue shows, the steps with
// their audit entries, and the reporter told on the first resolution only.
// On request:
//   DB_TESTS=1 pnpm backend test report-db
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  VenueType,
} from '@/generated/prisma/client';
import { ReportRepository } from './repositories/report.repository';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

const TEXT = 'Na akci mi opakovaně posílal nevhodné zprávy.';
const NOTE = 'Dvojice zablokována, nahlášení odpovídá.';

describeDb('the queue of reports in the database (#240)', () => {
  const prisma = new PrismaService();
  const repository = new ReportRepository(prisma);
  const now = new Date('2029-12-31T10:00:00Z');
  const created = {
    userIds: [] as string[],
    adminIds: [] as string[],
    eventIds: [] as string[],
    categoryIds: [] as string[],
  };
  let reasonId: string;

  beforeAll(async () => {
    reasonId = (
      await prisma.reportReason.findFirstOrThrow({ orderBy: { order: 'asc' } })
    ).id;
  });

  afterEach(async () => {
    await prisma.auditLogEntry.deleteMany({
      where: { adminId: { in: created.adminIds } },
    });
    await prisma.report.deleteMany({
      where: { reporterId: { in: created.userIds } },
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
    for (const list of Object.values(created)) list.length = 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const random = (): string => Math.random().toString(36).slice(2);

  const aUser = async (name = 'Test'): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        id: `test-${random()}`,
        name,
        email: `test-${random()}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });
    created.userIds.push(user.id);
    return user.id;
  };

  const anAdministrator = async (
    name = 'Správce',
  ): Promise<{ id: string; name: string }> => {
    const admin = await prisma.administrator.create({
      data: {
        id: `test-admin-${random()}`,
        name,
        email: `admin-${random()}@example.com`,
        createdAt: now,
        updatedAt: now,
      },
    });
    created.adminIds.push(admin.id);
    return { id: admin.id, name: admin.name };
  };

  const anEvent = async (organizerId: string): Promise<string> => {
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
        title: 'Florbal v hale',
        description: 'Test',
        status: EventStatus.PUBLISHED,
        approvalMode: ApprovalMode.MANUAL,
        venueType: VenueType.PLACE,
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
      },
    });
    created.eventIds.push(event.id);
    return event.id;
  };

  const reportUser = async (
    reporterId: string,
    targetUserId: string,
  ): Promise<string> => {
    const filed = await repository.create({
      reporterId,
      target: { type: 'USER', id: targetUserId },
      reasonId,
      text: TEXT,
    });
    if (!filed) throw new Error('not filed');
    return filed.id;
  };

  it('files a report, and refuses a second open one about the same target', async () => {
    const reporterId = await aUser();
    const targetId = await aUser();

    await reportUser(reporterId, targetId);

    await expect(
      repository.create({
        reporterId,
        target: { type: 'USER', id: targetId },
        reasonId,
        text: TEXT,
      }),
    ).resolves.toBeNull();
  });

  it('counts the other open reports about the same target', async () => {
    const [first, second, third] = [
      await aUser(),
      await aUser(),
      await aUser(),
    ];
    const organizerId = await aUser('Petr');
    const eventId = await anEvent(organizerId);
    for (const reporterId of [first, second, third]) {
      await repository.create({
        reporterId,
        target: { type: 'EVENT', id: eventId },
        reasonId,
        text: TEXT,
      });
    }
    await reportUser(first, organizerId);

    const reports = await repository.listAboutEvent(eventId);

    expect(reports).toHaveLength(3);
    expect(reports.map((report) => report.otherOpenReports)).toEqual([2, 2, 2]);
    expect(reports[0].target).toEqual({
      type: 'EVENT',
      id: eventId,
      name: 'Florbal v hale',
    });
  });

  it('filters the queue by state, target and the one responsible', async () => {
    const reporterId = await aUser();
    const admin = await anAdministrator();
    const takenId = await reportUser(reporterId, await aUser());
    const newId = await reportUser(reporterId, await aUser());
    await repository.assign({
      id: takenId,
      expected: { status: 'NEW', assigneeId: null },
      adminId: admin.id,
      assignee: admin,
    });

    const mine = await repository.list({
      status: 'OPEN',
      assigneeId: admin.id,
      offset: 0,
    });
    const users = await repository.list({
      status: 'NEW',
      targetType: 'USER',
      offset: 0,
    });
    const events = await repository.list({
      status: 'ALL',
      targetType: 'EVENT',
      offset: 0,
    });

    expect(mine.items.map((item) => item.id)).toEqual([takenId]);
    expect(users.items.map((item) => item.id)).toContain(newId);
    expect(users.items.map((item) => item.id)).not.toContain(takenId);
    expect(events.items.map((item) => item.id)).not.toContain(newId);
  });

  it('takes a report over only while it is as the service read it', async () => {
    const id = await reportUser(await aUser(), await aUser());
    const first = await anAdministrator('První');
    const second = await anAdministrator('Druhý');
    const asRead = { status: 'NEW', assigneeId: null } as const;

    await expect(
      repository.assign({
        id,
        expected: asRead,
        adminId: first.id,
        assignee: first,
      }),
    ).resolves.toBe(true);
    await expect(
      repository.assign({
        id,
        expected: asRead,
        adminId: second.id,
        assignee: second,
      }),
    ).resolves.toBe(false);
    await expect(repository.getState(id)).resolves.toEqual({
      status: 'IN_PROGRESS',
      assigneeId: first.id,
    });
  });

  it('tells the reporter on the first resolution only', async () => {
    const reporterId = await aUser();
    const id = await reportUser(reporterId, await aUser());
    const admin = await anAdministrator();

    await expect(
      repository.resolve({
        id,
        expected: { status: 'NEW', assigneeId: null },
        adminId: admin.id,
        note: NOTE,
        now,
      }),
    ).resolves.toEqual({ reporterId, notifyReporter: true });
    await expect(
      repository.reopen({
        id,
        expected: { status: 'RESOLVED', assigneeId: admin.id },
        adminId: admin.id,
      }),
    ).resolves.toBe(true);
    await expect(
      repository.resolve({
        id,
        expected: { status: 'IN_PROGRESS', assigneeId: admin.id },
        adminId: admin.id,
        note: NOTE,
        now,
      }),
    ).resolves.toEqual({ reporterId, notifyReporter: false });
  });

  it('makes whoever resolves a report nobody took responsible for it', async () => {
    const id = await reportUser(await aUser(), await aUser());
    const admin = await anAdministrator();

    await repository.resolve({
      id,
      expected: { status: 'NEW', assigneeId: null },
      adminId: admin.id,
      note: NOTE,
      now,
    });

    await expect(repository.getState(id)).resolves.toEqual({
      status: 'RESOLVED',
      assigneeId: admin.id,
    });
  });

  it('clears the note on reopening and keeps every step in the history', async () => {
    const reporterId = await aUser('Jana');
    const otherReporterId = await aUser();
    const targetId = await aUser('Petr');
    const id = await reportUser(reporterId, targetId);
    const otherId = await reportUser(otherReporterId, targetId);
    const first = await anAdministrator('První');
    const second = await anAdministrator('Druhá');

    await repository.assign({
      id,
      expected: { status: 'NEW', assigneeId: null },
      adminId: first.id,
      assignee: first,
    });
    await repository.assign({
      id,
      expected: { status: 'IN_PROGRESS', assigneeId: first.id },
      adminId: first.id,
      assignee: second,
    });
    await repository.resolve({
      id,
      expected: { status: 'IN_PROGRESS', assigneeId: second.id },
      adminId: second.id,
      note: NOTE,
      now,
    });
    await repository.reopen({
      id,
      expected: { status: 'RESOLVED', assigneeId: second.id },
      adminId: first.id,
    });

    const detail = await repository.getDetail(id);

    expect(detail).toMatchObject({
      status: 'IN_PROGRESS',
      assignee: first,
      reporter: { id: reporterId, name: 'Jana' },
      target: { type: 'USER', id: targetId, name: 'Petr' },
      text: TEXT,
      resolutionNote: null,
      resolvedAt: null,
    });
    expect(detail?.otherOpenReports.map((other) => other.id)).toEqual([
      otherId,
    ]);
    expect(
      detail?.history.map((entry) => [
        entry.action,
        entry.admin?.name ?? null,
        entry.description,
      ]),
    ).toEqual([
      ['CREATED', null, null],
      ['ASSIGNED', 'První', 'První'],
      ['ASSIGNED', 'První', 'Druhá'],
      ['RESOLVED', 'Druhá', NOTE],
      ['REOPENED', 'První', null],
    ]);
  });

  it('lists the reports about a user and the ones they filed apart', async () => {
    const userId = await aUser();
    const otherId = await aUser();
    const aboutId = await reportUser(otherId, userId);
    const filedId = await reportUser(userId, otherId);

    const [about, filed] = await Promise.all([
      repository.listAboutUser(userId),
      repository.listFiledBy(userId),
    ]);

    expect(about.map((report) => report.id)).toEqual([aboutId]);
    expect(filed.map((report) => report.id)).toEqual([filedId]);
  });
});
