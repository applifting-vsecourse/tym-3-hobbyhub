import {
  AdminReportDetail,
  AdminReportListItem,
  AdminUserReports,
  REPORT_HISTORY_ACTIONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  ReportHistoryAction,
  ReportHistoryEntry,
  ReportStatus,
  ReportTargetType,
} from '@/modules/report/domain/report';
import { AdminPage } from '@/shared/admin-auth/domain/administration';
import { ApiProperty } from '@nestjs/swagger';

// #240, ADR-0023: reports as the administration sees them (visibility matrix:
// Superadmin only).

export class AdminReportRefResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AdminReportTargetResponseDto {
  @ApiProperty({ enum: REPORT_TARGET_TYPES })
  type!: ReportTargetType;

  @ApiProperty()
  id!: string;

  @ApiProperty({ description: "The event's title or the user's name" })
  name!: string;
}

export class AdminReportSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: REPORT_STATUSES })
  status!: ReportStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: AdminReportTargetResponseDto })
  target!: AdminReportTargetResponseDto;

  @ApiProperty({ type: AdminReportRefResponseDto })
  reason!: AdminReportRefResponseDto;

  @ApiProperty({ type: AdminReportRefResponseDto })
  reporter!: AdminReportRefResponseDto;

  @ApiProperty({ type: AdminReportRefResponseDto, nullable: true })
  assignee!: AdminReportRefResponseDto | null;

  static fromDomain(
    item: Omit<AdminReportListItem, 'otherOpenReports'>,
  ): AdminReportSummaryResponseDto {
    return {
      id: item.id,
      status: item.status,
      createdAt: item.createdAt,
      target: {
        type: item.target.type,
        id: item.target.id,
        name: item.target.name,
      },
      reason: { id: item.reason.id, name: item.reason.name },
      reporter: { id: item.reporter.id, name: item.reporter.name },
      assignee: item.assignee
        ? { id: item.assignee.id, name: item.assignee.name }
        : null,
    };
  }
}

export class AdminReportListItemResponseDto extends AdminReportSummaryResponseDto {
  @ApiProperty({
    description: 'Other open reports about the same target, from anyone',
  })
  otherOpenReports!: number;

  static fromDomain(item: AdminReportListItem): AdminReportListItemResponseDto {
    return {
      ...AdminReportSummaryResponseDto.fromDomain(item),
      otherOpenReports: item.otherOpenReports,
    };
  }
}

export class AdminReportPageResponseDto {
  @ApiProperty({ type: [AdminReportListItemResponseDto] })
  items!: AdminReportListItemResponseDto[];

  @ApiProperty()
  total!: number;

  static fromDomain(
    page: AdminPage<AdminReportListItem>,
  ): AdminReportPageResponseDto {
    return {
      items: page.items.map((item) =>
        AdminReportListItemResponseDto.fromDomain(item),
      ),
      total: page.total,
    };
  }
}

export class AdminReportHistoryEntryResponseDto {
  @ApiProperty({ enum: REPORT_HISTORY_ACTIONS })
  action!: ReportHistoryAction;

  @ApiProperty({ type: String, format: 'date-time' })
  at!: Date;

  @ApiProperty({
    type: AdminReportRefResponseDto,
    nullable: true,
    description: 'Null for CREATED: the reporter is no administrator',
  })
  admin!: AdminReportRefResponseDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'ASSIGNED: whom it went to. RESOLVED: the note.',
  })
  description!: string | null;

  static fromDomain(
    entry: ReportHistoryEntry,
  ): AdminReportHistoryEntryResponseDto {
    return {
      action: entry.action,
      at: entry.at,
      admin: entry.admin
        ? { id: entry.admin.id, name: entry.admin.name }
        : null,
      description: entry.description,
    };
  }
}

export class AdminReportDetailResponseDto extends AdminReportSummaryResponseDto {
  @ApiProperty()
  text!: string;

  @ApiProperty({ type: String, nullable: true })
  resolutionNote!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  resolvedAt!: Date | null;

  @ApiProperty({
    type: [AdminReportSummaryResponseDto],
    description: 'Other open reports about the same target, newest first',
  })
  otherOpenReports!: AdminReportSummaryResponseDto[];

  @ApiProperty({
    type: [AdminReportHistoryEntryResponseDto],
    description: 'From its creation on, oldest first',
  })
  history!: AdminReportHistoryEntryResponseDto[];

  static fromDomain(detail: AdminReportDetail): AdminReportDetailResponseDto {
    return {
      ...AdminReportSummaryResponseDto.fromDomain(detail),
      text: detail.text,
      resolutionNote: detail.resolutionNote,
      resolvedAt: detail.resolvedAt,
      otherOpenReports: detail.otherOpenReports.map((other) =>
        AdminReportSummaryResponseDto.fromDomain(other),
      ),
      history: detail.history.map((entry) =>
        AdminReportHistoryEntryResponseDto.fromDomain(entry),
      ),
    };
  }
}

export class AdminUserReportsResponseDto {
  @ApiProperty({
    type: [AdminReportListItemResponseDto],
    description: 'Reports about the user',
  })
  about!: AdminReportListItemResponseDto[];

  @ApiProperty({
    type: [AdminReportListItemResponseDto],
    description: 'Reports the user filed',
  })
  filed!: AdminReportListItemResponseDto[];

  static fromDomain(reports: AdminUserReports): AdminUserReportsResponseDto {
    return {
      about: reports.about.map((item) =>
        AdminReportListItemResponseDto.fromDomain(item),
      ),
      filed: reports.filed.map((item) =>
        AdminReportListItemResponseDto.fromDomain(item),
      ),
    };
  }
}

export class AdminReportCountResponseDto {
  @ApiProperty({ description: 'Reports nobody has taken up yet' })
  count!: number;
}
