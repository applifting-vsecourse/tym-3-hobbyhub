// #240, ADR-0023: the database keeps a report consistent on its own, as the
// last line of defence behind the DTOs and the domain rules. On request:
//   DB_TESTS=1 pnpm backend test report-schema
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ApprovalMode,
  EventStatus,
  Prisma,
  Report,
  ReportStatus,
  VenueType,
} from '@/generated/prisma/client';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

const TEXT = 'Na akci mi opakovaně posílal nevhodné zprávy.';
const NOTE = 'Dvojice zablokována, nahlášení odpovídá.';

describeDb('reports in the database (#240)', () => {
  const prisma = new PrismaService();
  const now = new Date('2029-12-31T10:00:00Z');
  const created = {
    userIds: [] as string[],
    adminIds: [] as string[],
    eventIds: [] as string[],
    categoryIds: [] as string[],
  };

  afterEach(async () => {
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
        activityId: activity.id,
        organizerId,
      },
    });
    created.eventIds.push(event.id);
    return event.id;
  };

  const aReasonId = async (): Promise<string> => {
    const reason = await prisma.reportReason.findFirstOrThrow({
      orderBy: { order: 'asc' },
    });
    return reason.id;
  };

  const report = async (
    data: Partial<Prisma.ReportUncheckedCreateInput> & { reporterId: string },
  ): Promise<Report> =>
    prisma.report.create({
      data: { reasonId: await aReasonId(), text: TEXT, ...data },
    });

  it('has the fixed list of reasons with "Jiné" last', async () => {
    const reasons = await prisma.reportReason.findMany({
      orderBy: { order: 'asc' },
    });
    expect(reasons.map((reason) => reason.name)).toEqual([
      'Obtěžování nebo vyhrožování',
      'Nevhodný nebo urážlivý obsah',
      'Podvod nebo spam',
      'Nebezpečné chování',
      'Falešný profil nebo akce',
      'Jiné',
    ]);
  });

  it('keeps a report of an event and a report of a user', async () => {
    const reporterId = await aUser();
    const targetUserId = await aUser();
    const targetEventId = await anEvent(targetUserId);

    await expect(report({ reporterId, targetEventId })).resolves.toMatchObject(
      { status: ReportStatus.NEW },
    );
    await expect(report({ reporterId, targetUserId })).resolves.toMatchObject({
      status: ReportStatus.NEW,
    });
  });

  it('needs exactly one target', async () => {
    const reporterId = await aUser();
    const targetUserId = await aUser();
    const targetEventId = await anEvent(targetUserId);

    await expect(report({ reporterId })).rejects.toThrow('report_one_target');
    await expect(
      report({ reporterId, targetEventId, targetUserId }),
    ).rejects.toThrow('report_one_target');
  });

  it('refuses a report of oneself', async () => {
    const reporterId = await aUser();

    await expect(
      report({ reporterId, targetUserId: reporterId }),
    ).rejects.toThrow('report_not_self');
  });

  it.each([
    ['too short', 'Krátké'],
    ['only spaces around a short text', `   ${'a'.repeat(9)}   `],
  ])('refuses a text that is %s', async (_, text) => {
    const reporterId = await aUser();
    const targetUserId = await aUser();

    await expect(report({ reporterId, targetUserId, text })).rejects.toThrow(
      'report_text_length',
    );
  });

  it('needs someone responsible while the report is worked on', async () => {
    const reporterId = await aUser();
    const targetUserId = await aUser();

    await expect(
      report({
        reporterId,
        targetUserId,
        status: ReportStatus.IN_PROGRESS,
      }),
    ).rejects.toThrow('report_in_progress_assigned');
    await expect(
      report({
        reporterId,
        targetUserId,
        status: ReportStatus.IN_PROGRESS,
        assigneeId: await anAdministrator(),
      }),
    ).resolves.toMatchObject({ status: ReportStatus.IN_PROGRESS });
  });

  it('has a note and a time of resolution exactly when resolved', async () => {
    const reporterId = await aUser();
    const targetUserId = await aUser();

    await expect(
      report({ reporterId, targetUserId, status: ReportStatus.RESOLVED }),
    ).rejects.toThrow('report_resolved_all_or_nothing');
    await expect(
      report({
        reporterId,
        targetUserId,
        status: ReportStatus.RESOLVED,
        resolvedAt: now,
      }),
    ).rejects.toThrow('report_resolved_all_or_nothing');
    await expect(
      report({ reporterId, targetUserId, resolutionNote: NOTE }),
    ).rejects.toThrow('report_resolved_all_or_nothing');
    await expect(
      report({
        reporterId,
        targetUserId,
        status: ReportStatus.RESOLVED,
        resolvedAt: now,
        resolutionNote: 'Krátká',
      }),
    ).rejects.toThrow('report_resolution_note_length');
    await expect(
      report({
        reporterId,
        targetUserId,
        status: ReportStatus.RESOLVED,
        resolvedAt: now,
        resolutionNote: NOTE,
      }),
    ).resolves.toMatchObject({ status: ReportStatus.RESOLVED });
  });

  it('keeps one open report per reporter and user, and allows a new one after resolution', async () => {
    const reporterId = await aUser();
    const targetUserId = await aUser();
    const first = await report({ reporterId, targetUserId });

    await expect(report({ reporterId, targetUserId })).rejects.toThrow();

    await prisma.report.update({
      where: { id: first.id },
      data: {
        status: ReportStatus.RESOLVED,
        resolvedAt: now,
        resolutionNote: NOTE,
      },
    });
    await expect(report({ reporterId, targetUserId })).resolves.toMatchObject(
      { status: ReportStatus.NEW },
    );
  });

  it('keeps one open report per reporter and event, but others may report it too', async () => {
    const reporterId = await aUser();
    const otherReporterId = await aUser();
    const targetEventId = await anEvent(await aUser());
    await report({ reporterId, targetEventId });

    await expect(report({ reporterId, targetEventId })).rejects.toThrow();
    await expect(
      report({ reporterId: otherReporterId, targetEventId }),
    ).resolves.toMatchObject({ status: ReportStatus.NEW });
  });

  it('is evidence: a reported event cannot be deleted from under it', async () => {
    const reporterId = await aUser();
    const targetEventId = await anEvent(await aUser());
    await report({ reporterId, targetEventId });

    await expect(
      prisma.event.delete({ where: { id: targetEventId } }),
    ).rejects.toThrow();
  });
});
