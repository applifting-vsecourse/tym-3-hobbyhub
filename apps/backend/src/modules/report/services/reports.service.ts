import { AdministratorsService } from '@/modules/administrator/services/administrators.service';
import { EventsService } from '@/modules/event/services/events.service';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { ProfileService } from '@/modules/profile/services/profile.service';
import { ReportReasonsService } from '@/modules/report-reason/services/report-reasons.service';
import {
  AdminReportDetail,
  AdminReportFilter,
  AdminReportListItem,
  AdminUserReports,
  assignViolations,
  FiledReport,
  NewReport,
  reopenViolations,
  reportRuleViolations,
  ReportState,
  ReportTransitionViolation,
  ReportViolation,
  resolveViolations,
} from '@/modules/report/domain/report';
import { ReportRepository } from '@/modules/report/repositories/report.repository';
import { AdminPage } from '@/shared/admin-auth/domain/administration';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

type Violation = ReportViolation | ReportTransitionViolation | 'CHANGED';

const VIOLATION_MESSAGES: Record<Violation, string> = {
  SELF: 'Nobody can report themselves',
  OWN_EVENT: 'An organizer cannot report their own event',
  UNKNOWN_REASON: 'No such report reason',
  ALREADY_REPORTED: 'You have an open report about this already',
  ALREADY_RESOLVED: 'The report is resolved already',
  NOT_RESOLVED: 'Only a resolved report can be reopened',
  ALREADY_ASSIGNED: 'The report is in their hands already',
  ASSIGNEE_NOT_ACTIVE: 'A report can be handed to an active administrator only',
  CHANGED: 'Someone else changed the report meanwhile; load it again',
};

// The same shape as the other modules' refusals: messages and their codes.
const body = (
  statusCode: number,
  error: string,
  violations: Violation[],
): Record<string, unknown> => ({
  statusCode,
  error,
  message: violations.map((violation) => VIOLATION_MESSAGES[violation]),
  violations,
});

const refused = (violations: Violation[]): BadRequestException =>
  new BadRequestException(body(400, 'Bad Request', violations));

const conflict = (violations: Violation[]): ConflictException =>
  new ConflictException(body(409, 'Conflict', violations));

// #240, ADR-0023: users report events and other users; the administrators
// work through the reports. Nobody but the administration ever learns that a
// report exists, so nothing here tells the reported anything.
@Injectable()
export class ReportsService {
  constructor(
    private readonly repository: ReportRepository,
    private readonly reasons: ReportReasonsService,
    private readonly events: EventsService,
    private readonly profiles: ProfileService,
    private readonly administrators: AdministratorsService,
    private readonly notifications: NotificationsService,
  ) {}

  // -------------------------------------------------------------------------
  // The reporter's side.
  // -------------------------------------------------------------------------

  // Only what the reporter may see can be reported: anything else is the
  // same 404 the detail gives (visibility matrix).
  async report(
    user: Identity,
    input: Omit<NewReport, 'reporterId'>,
  ): Promise<FiledReport> {
    const report: NewReport = {
      ...input,
      reporterId: user.id,
      text: input.text.trim(),
    };
    const selfViolations = reportRuleViolations(report);
    if (selfViolations.length > 0) throw refused(selfViolations);

    if (report.target.type === 'EVENT') {
      const organizerIds = await this.events.getVisibleEventOrganizerIds(
        report.target.id,
        user,
      );
      const violations = reportRuleViolations({ ...report, organizerIds });
      if (violations.length > 0) throw refused(violations);
    } else {
      await this.profiles.getPublicProfile(report.target.id, user);
    }

    if (!(await this.reasons.isAvailable(report.reasonId))) {
      throw refused(['UNKNOWN_REASON']);
    }
    const filed = await this.repository.create(report);
    if (!filed) throw conflict(['ALREADY_REPORTED']);
    return filed;
  }

  // -------------------------------------------------------------------------
  // The administration's side: the queue.
  // -------------------------------------------------------------------------

  list(filter: AdminReportFilter): Promise<AdminPage<AdminReportListItem>> {
    return this.repository.list(filter);
  }

  countNew(): Promise<number> {
    return this.repository.countNew();
  }

  async getDetail(id: string): Promise<AdminReportDetail> {
    const detail = await this.repository.getDetail(id);
    if (!detail) throw new NotFoundException('Report not found');
    return detail;
  }

  async listOfUser(userId: string): Promise<AdminUserReports> {
    if (!(await this.repository.userExists(userId))) {
      throw new NotFoundException('User not found');
    }
    const [about, filed] = await Promise.all([
      this.repository.listAboutUser(userId),
      this.repository.listFiledBy(userId),
    ]);
    return { about, filed };
  }

  async listOfEvent(eventId: string): Promise<AdminReportListItem[]> {
    if (!(await this.repository.eventExists(eventId))) {
      throw new NotFoundException('Event not found');
    }
    return this.repository.listAboutEvent(eventId);
  }

  // Without `assigneeId` the administrator takes the report over; with it
  // they hand it to an active colleague.
  async assign(
    admin: AdminIdentity,
    id: string,
    assigneeId: string = admin.id,
  ): Promise<AdminReportDetail> {
    const state = await this.getState(id);
    const violations = assignViolations(state, assigneeId);
    if (violations.length > 0) throw refused(violations);
    const assignee =
      assigneeId === admin.id
        ? { id: admin.id, name: admin.name }
        : await this.administrators.getActiveAdministrator(assigneeId);
    if (!assignee) throw refused(['ASSIGNEE_NOT_ACTIVE']);

    const done = await this.repository.assign({
      id,
      expected: state,
      adminId: admin.id,
      assignee,
    });
    if (!done) throw conflict(['CHANGED']);
    return this.getDetail(id);
  }

  async resolve(
    admin: AdminIdentity,
    id: string,
    note: string,
    now: Date = new Date(),
  ): Promise<AdminReportDetail> {
    const state = await this.getState(id);
    const violations = resolveViolations(state);
    if (violations.length > 0) throw refused(violations);

    const resolved = await this.repository.resolve({
      id,
      expected: state,
      adminId: admin.id,
      note: note.trim(),
      now,
    });
    if (!resolved) throw conflict(['CHANGED']);
    if (resolved.notifyReporter) {
      await this.notifications.notifyReportResolved({
        reporterId: resolved.reporterId,
      });
    }
    return this.getDetail(id);
  }

  async reopen(admin: AdminIdentity, id: string): Promise<AdminReportDetail> {
    const state = await this.getState(id);
    const violations = reopenViolations(state);
    if (violations.length > 0) throw refused(violations);

    const done = await this.repository.reopen({
      id,
      expected: state,
      adminId: admin.id,
    });
    if (!done) throw conflict(['CHANGED']);
    return this.getDetail(id);
  }

  private async getState(id: string): Promise<ReportState> {
    const state = await this.repository.getState(id);
    if (!state) throw new NotFoundException('Report not found');
    return state;
  }
}
