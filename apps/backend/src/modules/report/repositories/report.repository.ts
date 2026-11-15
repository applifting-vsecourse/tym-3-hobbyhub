import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma, ReportStatus } from '@/generated/prisma/client';
import {
  AdminReportDetail,
  AdminReportFilter,
  AdminReportListItem,
  FiledReport,
  NewReport,
  ReportHistoryAction,
  ReportHistoryEntry,
  ReportState,
  statusesOf,
} from '@/modules/report/domain/report';
import {
  ADMIN_PAGE_SIZE,
  AdminPage,
} from '@/shared/admin-auth/domain/administration';
import { AuditAction, recordAuditLogEntry } from '@/shared/audit-log/audit-log';
import { Injectable } from '@nestjs/common';

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

const OPEN: ReportStatus[] = [ReportStatus.NEW, ReportStatus.IN_PROGRESS];

const include = {
  reporter: { select: { id: true, name: true } },
  targetEvent: { select: { id: true, title: true } },
  targetUser: { select: { id: true, name: true } },
  reason: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.ReportInclude;

type ReportRow = Prisma.ReportGetPayload<{ include: typeof include }>;

const HISTORY_ACTIONS: Partial<Record<string, ReportHistoryAction>> = {
  REPORT_ASSIGNED: 'ASSIGNED',
  REPORT_RESOLVED: 'RESOLVED',
  REPORT_REOPENED: 'REOPENED',
} satisfies Partial<Record<AuditAction, ReportHistoryAction>>;

const toItem = (
  row: ReportRow,
): Omit<AdminReportListItem, 'otherOpenReports'> => ({
  id: row.id,
  status: row.status,
  createdAt: row.createdAt,
  target: row.targetEvent
    ? { type: 'EVENT', id: row.targetEvent.id, name: row.targetEvent.title }
    : {
        type: 'USER',
        // The CHECK report_one_target guarantees one of the two.
        id: row.targetUser!.id,
        name: row.targetUser!.name,
      },
  reason: row.reason,
  reporter: row.reporter,
  assignee: row.assignee,
});

// #240, ADR-0023: the reports, and the administration's work on them. Every
// change of state happens only while the report is still as the service read
// it, and is written to the audit log in the same transaction.
@Injectable()
export class ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Null when the reporter has an open report about the target already
  // (partial unique indexes report_one_open_per_event / _per_user).
  async create(report: NewReport): Promise<FiledReport | null> {
    try {
      const row = await this.prisma.report.create({
        data: {
          reporterId: report.reporterId,
          targetEventId:
            report.target.type === 'EVENT' ? report.target.id : null,
          targetUserId: report.target.type === 'USER' ? report.target.id : null,
          reasonId: report.reasonId,
          text: report.text,
        },
        select: { id: true, createdAt: true },
      });
      return row;
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async list(
    filter: AdminReportFilter,
  ): Promise<AdminPage<AdminReportListItem>> {
    const where: Prisma.ReportWhereInput = {
      status: { in: [...statusesOf(filter.status)] },
      ...(filter.targetType === 'EVENT'
        ? { targetEventId: { not: null } }
        : {}),
      ...(filter.targetType === 'USER' ? { targetUserId: { not: null } } : {}),
      ...(filter.assigneeId ? { assigneeId: filter.assigneeId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: filter.offset,
        take: ADMIN_PAGE_SIZE,
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items: await this.withOtherOpen(rows), total };
  }

  countNew(): Promise<number> {
    return this.prisma.report.count({ where: { status: ReportStatus.NEW } });
  }

  async getState(id: string): Promise<ReportState | null> {
    return this.prisma.report.findUnique({
      where: { id },
      select: { status: true, assigneeId: true },
    });
  }

  async getDetail(id: string): Promise<AdminReportDetail | null> {
    const row = await this.prisma.report.findUnique({ where: { id }, include });
    if (!row) return null;
    const [others, entries] = await Promise.all([
      this.prisma.report.findMany({
        where: {
          id: { not: id },
          status: { in: OPEN },
          ...(row.targetEventId
            ? { targetEventId: row.targetEventId }
            : { targetUserId: row.targetUserId }),
        },
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.auditLogEntry.findMany({
        where: { targetType: 'REPORT', targetId: id },
        include: { admin: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const history: ReportHistoryEntry[] = [
      { action: 'CREATED', at: row.createdAt, admin: null, description: null },
      ...entries.flatMap((entry): ReportHistoryEntry[] => {
        const action = HISTORY_ACTIONS[entry.action];
        return action
          ? [
              {
                action,
                at: entry.createdAt,
                admin: entry.admin,
                description: entry.description,
              },
            ]
          : [];
      }),
    ];
    return {
      ...toItem(row),
      text: row.text,
      resolutionNote: row.resolutionNote,
      resolvedAt: row.resolvedAt,
      otherOpenReports: others.map(toItem),
      history,
    };
  }

  async listAboutUser(userId: string): Promise<AdminReportListItem[]> {
    return this.listWhere({ targetUserId: userId });
  }

  async listFiledBy(userId: string): Promise<AdminReportListItem[]> {
    return this.listWhere({ reporterId: userId });
  }

  async listAboutEvent(eventId: string): Promise<AdminReportListItem[]> {
    return this.listWhere({ targetEventId: eventId });
  }

  async userExists(id: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { id } })) > 0;
  }

  async eventExists(id: string): Promise<boolean> {
    return (await this.prisma.event.count({ where: { id } })) > 0;
  }

  // Taking over and handing on: IN_PROGRESS with the new person responsible.
  async assign(change: {
    id: string;
    expected: ReportState;
    adminId: string;
    assignee: { id: string; name: string };
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.report.updateMany({
        where: { id: change.id, ...change.expected },
        data: {
          status: ReportStatus.IN_PROGRESS,
          assigneeId: change.assignee.id,
        },
      });
      if (count === 0) return false;
      await recordAuditLogEntry(tx, {
        adminId: change.adminId,
        action: 'REPORT_ASSIGNED',
        targetType: 'REPORT',
        targetId: change.id,
        description: change.assignee.name,
      });
      return true;
    });
  }

  // Whoever resolves a report nobody took is responsible for it. The
  // reporter is told on the first resolution only (`reporterNotifiedAt`).
  async resolve(change: {
    id: string;
    expected: ReportState;
    adminId: string;
    note: string;
    now: Date;
  }): Promise<{ reporterId: string; notifyReporter: boolean } | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.report.updateMany({
        where: { id: change.id, ...change.expected },
        data: {
          status: ReportStatus.RESOLVED,
          resolutionNote: change.note,
          resolvedAt: change.now,
          assigneeId: change.expected.assigneeId ?? change.adminId,
        },
      });
      if (count === 0) return null;
      const notified = await tx.report.updateMany({
        where: { id: change.id, reporterNotifiedAt: null },
        data: { reporterNotifiedAt: change.now },
      });
      await recordAuditLogEntry(tx, {
        adminId: change.adminId,
        action: 'REPORT_RESOLVED',
        targetType: 'REPORT',
        targetId: change.id,
        description: change.note,
      });
      const { reporterId } = await tx.report.findUniqueOrThrow({
        where: { id: change.id },
        select: { reporterId: true },
      });
      return { reporterId, notifyReporter: notified.count > 0 };
    });
  }

  // Back to IN_PROGRESS with the one who reopened it responsible; the note
  // and the time go, the audit log keeps them.
  async reopen(change: {
    id: string;
    expected: ReportState;
    adminId: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.report.updateMany({
        where: { id: change.id, ...change.expected },
        data: {
          status: ReportStatus.IN_PROGRESS,
          assigneeId: change.adminId,
          resolutionNote: null,
          resolvedAt: null,
        },
      });
      if (count === 0) return false;
      await recordAuditLogEntry(tx, {
        adminId: change.adminId,
        action: 'REPORT_REOPENED',
        targetType: 'REPORT',
        targetId: change.id,
      });
      return true;
    });
  }

  private async listWhere(
    where: Prisma.ReportWhereInput,
  ): Promise<AdminReportListItem[]> {
    const rows = await this.prisma.report.findMany({
      where,
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return this.withOtherOpen(rows);
  }

  // How many other open reports point at the same target as each row.
  private async withOtherOpen(
    rows: ReportRow[],
  ): Promise<AdminReportListItem[]> {
    const eventIds = [
      ...new Set(rows.flatMap((row) => row.targetEventId ?? [])),
    ];
    const userIds = [...new Set(rows.flatMap((row) => row.targetUserId ?? []))];
    const [byEvent, byUser] = await Promise.all([
      eventIds.length === 0
        ? []
        : this.prisma.report.groupBy({
            by: ['targetEventId'],
            where: { status: { in: OPEN }, targetEventId: { in: eventIds } },
            _count: { _all: true },
          }),
      userIds.length === 0
        ? []
        : this.prisma.report.groupBy({
            by: ['targetUserId'],
            where: { status: { in: OPEN }, targetUserId: { in: userIds } },
            _count: { _all: true },
          }),
    ]);
    const openCount = new Map<string, number>([
      ...byEvent.map((group): [string, number] => [
        `EVENT:${group.targetEventId}`,
        group._count._all,
      ]),
      ...byUser.map((group): [string, number] => [
        `USER:${group.targetUserId}`,
        group._count._all,
      ]),
    ]);
    return rows.map((row) => {
      const item = toItem(row);
      const open = openCount.get(`${item.target.type}:${item.target.id}`) ?? 0;
      const self = OPEN.includes(row.status) ? 1 : 0;
      return { ...item, otherOpenReports: open - self };
    });
  }
}
