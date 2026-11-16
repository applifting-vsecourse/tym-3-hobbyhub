import { useTranslation } from "react-i18next"

import { AdminTable } from "@/components/hobbyhub/AdminTable"
import { Badge } from "@/components/ui/badge"

import type {
  AdminReportListItem,
  AdminReportSummary,
  ReportStatus,
} from "@/features/admin/api/reportSchemas"
import { AdminLink } from "@/features/admin/components/AdminLink"
import { useAdminFormat } from "@/features/admin/lib/format"

const STATUS_VARIANT = {
  NEW: "pending",
  IN_PROGRESS: "secondary",
  RESOLVED: "success",
} as const satisfies Record<ReportStatus, string>

/** #240: new waits for someone, in progress is in someone's hands, resolved is done. */
export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const { t } = useTranslation()
  return <Badge variant={STATUS_VARIANT[status]}>{t(`admin.reports.status.${status}`)}</Badge>
}

/** What a report is about, as a link to its detail in the administration. */
export function ReportTargetLink({ target }: { target: AdminReportSummary["target"] }) {
  const { t } = useTranslation()
  return (
    <span className="flex flex-col">
      <AdminLink to={{ kind: target.type === "EVENT" ? "event" : "user", id: target.id }}>
        {target.name}
      </AdminLink>
      <span className="typo-caption text-muted-foreground">
        {t(`admin.reports.targetType.${target.type}`)}
      </span>
    </span>
  )
}

type AdminReportsTableProps = {
  label: string
  rows: (AdminReportSummary & Partial<Pick<AdminReportListItem, "otherOpenReports">>)[]
}

/**
 * #240, #73: reports in the queue and in the details of a user or an event.
 * The first column leads to the report; the target has its own column.
 */
export function AdminReportsTable({ label, rows }: AdminReportsTableProps) {
  const { t } = useTranslation()
  const format = useAdminFormat()

  return (
    <AdminTable<AdminReportsTableProps["rows"][number]>
      label={label}
      rows={rows}
      rowKey={(report) => report.id}
      primary={{
        key: "reason",
        header: t("admin.reports.reason"),
        cell: (report) => (
          <AdminLink to={{ kind: "report", id: report.id }}>{report.reason.name}</AdminLink>
        ),
      }}
      columns={[
        {
          key: "target",
          header: t("admin.reports.target"),
          cell: (report) => (
            <span className="flex flex-col gap-1">
              <ReportTargetLink target={report.target} />
              {report.otherOpenReports ? (
                <span className="typo-caption text-muted-foreground">
                  {t("admin.reports.otherOpen", { count: report.otherOpenReports })}
                </span>
              ) : null}
            </span>
          ),
        },
        {
          key: "status",
          header: t("admin.reports.state"),
          cell: (report) => <ReportStatusBadge status={report.status} />,
        },
        {
          key: "reporter",
          header: t("admin.reports.reporter"),
          cell: (report) => (
            <AdminLink to={{ kind: "user", id: report.reporter.id }}>
              {report.reporter.name}
            </AdminLink>
          ),
        },
        {
          key: "assignee",
          header: t("admin.reports.assignee"),
          cell: (report) => report.assignee?.name ?? t("admin.none"),
        },
        {
          key: "createdAt",
          header: t("admin.reports.createdAt"),
          cell: (report) => format.dateTime(report.createdAt),
        },
      ]}
    />
  )
}
