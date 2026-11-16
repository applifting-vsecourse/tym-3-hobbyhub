import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import {
  adminEventReportsQueryOptions,
  adminUserReportsQueryOptions,
} from "@/features/admin/api/reportQueryOptions"
import type { AdminReportListItem } from "@/features/admin/api/reportSchemas"
import { AdminSection } from "@/features/admin/components/AdminFacts"
import { AdminReportsTable } from "@/features/admin/components/AdminReportsTable"
import { AdminState } from "@/features/admin/components/AdminState"

function ReportRows({
  label,
  rows,
  empty,
}: {
  label: string
  rows: AdminReportListItem[]
  empty: string
}) {
  return rows.length === 0 ? (
    <p className="typo-body text-muted-foreground">{empty}</p>
  ) : (
    <AdminReportsTable
      label={label}
      rows={rows}
    />
  )
}

/** #240: reports about the person, and the ones they filed. Every state, newest first. */
export function AdminUserReports({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const query = useQuery(adminUserReportsQueryOptions(userId))

  return (
    <>
      <AdminSection title={t("admin.reports.aboutUser")}>
        {query.data ? (
          <ReportRows
            label={t("admin.reports.aboutUser")}
            rows={query.data.about}
            empty={t("admin.reports.noneAboutUser")}
          />
        ) : (
          <AdminState query={query} />
        )}
      </AdminSection>
      <AdminSection title={t("admin.reports.filedByUser")}>
        {query.data ? (
          <ReportRows
            label={t("admin.reports.filedByUser")}
            rows={query.data.filed}
            empty={t("admin.reports.noneFiledByUser")}
          />
        ) : (
          <AdminState query={query} />
        )}
      </AdminSection>
    </>
  )
}

/** #240: reports about the event. Every state, newest first. */
export function AdminEventReports({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const query = useQuery(adminEventReportsQueryOptions(eventId))

  return (
    <AdminSection title={t("admin.reports.aboutEvent")}>
      {query.data ? (
        <ReportRows
          label={t("admin.reports.aboutEvent")}
          rows={query.data}
          empty={t("admin.reports.noneAboutEvent")}
        />
      ) : (
        <AdminState query={query} />
      )}
    </AdminSection>
  )
}
