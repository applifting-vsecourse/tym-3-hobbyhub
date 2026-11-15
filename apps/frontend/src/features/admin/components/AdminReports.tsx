import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { adminReportsQueryOptions } from "@/features/admin/api/reportQueryOptions"
import {
  REPORT_STATUS_FILTERS,
  REPORT_TARGET_TYPES,
  reportStatusFilterSchema,
  reportTargetTypeSchema,
  type AdminReportFilter,
} from "@/features/admin/api/reportSchemas"
import { AdminPager } from "@/features/admin/components/AdminPager"
import { AdminReportsTable } from "@/features/admin/components/AdminReportsTable"
import { AdminState } from "@/features/admin/components/AdminState"

const ANY_TARGET = "ANY"

type AdminReportsProps = {
  filter: AdminReportFilter
  /** Puts the filter into the URL; a new filter starts at the first page. */
  onChange: (next: AdminReportFilter) => void
}

/** #240, #73, ADR-0023: the queue of reports, the open ones first in view. */
export function AdminReports({ filter, onChange }: AdminReportsProps) {
  const { t } = useTranslation()
  const statusId = useId()
  const targetId = useId()
  const mineId = useId()
  const query = useQuery(adminReportsQueryOptions(filter))
  const page = query.data
  const refilter = (next: Partial<AdminReportFilter>) => onChange({ ...filter, ...next, offset: 0 })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="typo-h1 text-foreground">{t("admin.reports.title")}</h1>

      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-2 md:w-48">
          <Label htmlFor={statusId}>{t("admin.reports.filter.status")}</Label>
          <Select
            value={filter.status}
            onValueChange={(value) => refilter({ status: reportStatusFilterSchema.parse(value) })}
          >
            <SelectTrigger
              id={statusId}
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_STATUS_FILTERS.map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                >
                  {t(`admin.reports.filter.statuses.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 md:w-48">
          <Label htmlFor={targetId}>{t("admin.reports.filter.target")}</Label>
          <Select
            value={filter.targetType ?? ANY_TARGET}
            onValueChange={(value) =>
              refilter({
                targetType: value === ANY_TARGET ? undefined : reportTargetTypeSchema.parse(value),
              })
            }
          >
            <SelectTrigger
              id={targetId}
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_TARGET}>{t("admin.reports.filter.anyTarget")}</SelectItem>
              {REPORT_TARGET_TYPES.map((type) => (
                <SelectItem
                  key={type}
                  value={type}
                >
                  {t(`admin.reports.filter.targets.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-h-11 items-center gap-3 md:min-h-9">
          <Checkbox
            id={mineId}
            checked={filter.mine}
            onCheckedChange={(checked) => refilter({ mine: checked === true })}
          />
          <Label htmlFor={mineId}>{t("admin.reports.filter.mine")}</Label>
        </div>
      </div>

      {page ? (
        page.items.length === 0 ? (
          <p className="py-8 text-center typo-body text-muted-foreground">
            {t(
              filter.status === "OPEN" && !filter.targetType && !filter.mine
                ? "admin.reports.empty"
                : "admin.reports.noMatch",
            )}
          </p>
        ) : (
          <>
            <AdminReportsTable
              label={t("admin.reports.title")}
              rows={page.items}
            />
            <AdminPager
              offset={filter.offset}
              shown={page.items.length}
              total={page.total}
              onOffsetChange={(offset) => onChange({ ...filter, offset })}
            />
          </>
        )
      ) : (
        <AdminState query={query} />
      )}
    </div>
  )
}
