import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"

import { adminUsersQueryOptions } from "@/features/admin/api/adminQueryOptions"
import { adminReportsQueryOptions } from "@/features/admin/api/reportQueryOptions"
import type { AdminReportFilter, ReportTargetType } from "@/features/admin/api/reportSchemas"
import { AdminReportsTable } from "@/features/admin/components/AdminReportsTable"
import { AdminState } from "@/features/admin/components/AdminState"

const OPEN_EVENTS: AdminReportFilter = {
  status: "OPEN",
  targetType: "EVENT",
  mine: false,
  offset: 0,
}
const OPEN_USERS: AdminReportFilter = { ...OPEN_EVENTS, targetType: "USER" }

/** The few oldest-first rows a block shows; the rest is one click away. */
const SHOWN = 5

const linkClass =
  "typo-label text-accent-foreground underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"

function ReportsBlock({ target, filter }: { target: ReportTargetType; filter: AdminReportFilter }) {
  const { t } = useTranslation()
  const query = useQuery(adminReportsQueryOptions(filter))
  const page = query.data
  const headingId = `attention-${target}`

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={headingId}
          className="typo-h3 text-foreground"
        >
          {t(`admin.attention.reports.${target}`)}
          {page ? <span className="text-muted-foreground"> · {page.total}</span> : null}
        </h2>
        {page && page.total > 0 ? (
          <Link
            to={ROUTES.adminReports}
            search={{ target }}
            className={linkClass}
          >
            {t("admin.attention.all")}
          </Link>
        ) : null}
      </div>
      {page ? (
        page.items.length === 0 ? (
          <p className="typo-body text-muted-foreground">
            {t(`admin.attention.reports.empty.${target}`)}
          </p>
        ) : (
          <AdminReportsTable
            label={t(`admin.attention.reports.${target}`)}
            rows={page.items.slice(0, SHOWN)}
          />
        )
      ) : (
        <AdminState query={query} />
      )}
    </section>
  )
}

/**
 * #273: everything that waits for an administrator on one page: reported
 * events, reported people and accounts nobody has verified. Each block has its
 * own loading, empty and error state, so one failing leaves the others.
 */
export function AdminAttention() {
  const { t } = useTranslation()
  const unverified = useQuery(adminUsersQueryOptions("", 0, "unverified"))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="typo-h1 text-foreground">{t("admin.attention.title")}</h1>
        <p className="max-w-prose typo-body text-muted-foreground">{t("admin.attention.intro")}</p>
      </div>

      <ReportsBlock
        target="EVENT"
        filter={OPEN_EVENTS}
      />
      <ReportsBlock
        target="USER"
        filter={OPEN_USERS}
      />

      <section
        aria-labelledby="attention-unverified"
        className="flex flex-col gap-3"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="attention-unverified"
            className="typo-h3 text-foreground"
          >
            {t("admin.attention.unverified.title")}
            {unverified.data ? (
              <span className="text-muted-foreground"> · {unverified.data.total}</span>
            ) : null}
          </h2>
          {unverified.data && unverified.data.total > 0 ? (
            <Link
              to={ROUTES.adminUsers}
              search={{ filter: "unverified" }}
              className={linkClass}
            >
              {t("admin.attention.all")}
            </Link>
          ) : null}
        </div>
        {unverified.data ? (
          <p className="typo-body text-muted-foreground">
            {unverified.data.total === 0
              ? t("admin.attention.unverified.empty")
              : t("admin.attention.unverified.text", { count: unverified.data.total })}
          </p>
        ) : (
          <AdminState query={unverified} />
        )}
      </section>
    </div>
  )
}
