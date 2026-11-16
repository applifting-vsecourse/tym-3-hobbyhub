import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { adminEventQueryOptions } from "@/features/admin/api/adminQueryOptions"
import {
  useAssignReport,
  useReopenReport,
  useResolveReport,
} from "@/features/admin/api/reportMutations"
import { adminReportQueryOptions } from "@/features/admin/api/reportQueryOptions"
import type { AdminReportDetail as Detail } from "@/features/admin/api/reportSchemas"
import { useBlockUser } from "@/features/admin/api/userBlockMutations"
import { EventModeration } from "@/features/admin/components/AdminEventDetail"
import { AdminFacts, AdminSection } from "@/features/admin/components/AdminFacts"
import { AdminLink } from "@/features/admin/components/AdminLink"
import {
  AdminReportsTable,
  ReportStatusBadge,
  ReportTargetLink,
} from "@/features/admin/components/AdminReportsTable"
import { AdminState } from "@/features/admin/components/AdminState"
import { BlockUserSheet } from "@/features/admin/components/BlockUserSheet"
import {
  AssignReportSheet,
  reportStepErrorOf,
  ResolveReportSheet,
} from "@/features/admin/components/ReportStepSheets"
import { useAdminSession } from "@/features/admin/hooks/useAdminSession"
import { useAdminFormat } from "@/features/admin/lib/format"

/**
 * #240, #73: take the report over, hand it on, resolve it with a note, or
 * reopen it. Every step goes to the audit log on the server.
 */
function ReportSteps({ report }: { report: Detail }) {
  const { t } = useTranslation()
  const { administrator } = useAdminSession()
  const [sheet, setSheet] = useState<"assign" | "resolve" | null>(null)
  const assign = useAssignReport(report.id)
  const resolve = useResolveReport(report.id)
  const reopen = useReopenReport(report.id)
  const isMine = report.assignee !== null && report.assignee.id === administrator?.id
  const isResolved = report.status === "RESOLVED"
  // Taking over and reopening have no sheet: their error shows on the page.
  // Handing over shows its own in the sheet, which resets them all on opening.
  const inlineError = sheet === null ? reportStepErrorOf(t, assign.error ?? reopen.error) : null

  const open = (next: "assign" | "resolve") => {
    assign.reset()
    resolve.reset()
    reopen.reset()
    setSheet(next)
  }

  return (
    <AdminSection title={t("admin.reports.steps.title")}>
      {inlineError ? (
        <Alert variant="destructive">
          <AlertDescription>{inlineError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {isResolved ? (
          <Button
            variant="outline"
            disabled={reopen.isPending}
            onClick={() => {
              assign.reset()
              reopen.mutate(undefined, {
                onSuccess: () => toast.success(t("admin.reports.steps.reopened")),
              })
            }}
          >
            {t("admin.reports.steps.reopen")}
          </Button>
        ) : (
          <>
            {isMine ? null : (
              <Button
                variant="outline"
                disabled={assign.isPending}
                onClick={() => {
                  reopen.reset()
                  assign.mutate(
                    {},
                    { onSuccess: () => toast.success(t("admin.reports.steps.taken")) },
                  )
                }}
              >
                {t("admin.reports.steps.take")}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => open("assign")}
            >
              {t("admin.reports.steps.handOver")}
            </Button>
            <Button onClick={() => open("resolve")}>{t("admin.reports.steps.resolve")}</Button>
          </>
        )}
      </div>
      <AssignReportSheet
        isOpen={sheet === "assign"}
        onOpenChange={(isOpen) => setSheet(isOpen ? "assign" : null)}
        excludeIds={report.assignee ? [report.assignee.id] : []}
        isPending={assign.isPending}
        error={assign.error}
        onSubmit={async (values) => {
          await assign.mutateAsync(values)
          setSheet(null)
          toast.success(t("admin.reports.steps.handedOver"))
        }}
      />
      <ResolveReportSheet
        isOpen={sheet === "resolve"}
        onOpenChange={(isOpen) => setSheet(isOpen ? "resolve" : null)}
        isPending={resolve.isPending}
        error={resolve.error}
        onSubmit={async (values) => {
          await resolve.mutateAsync(values)
          setSheet(null)
          toast.success(t("admin.reports.steps.resolved"))
        }}
      />
    </AdminSection>
  )
}

/** #239 from a report about an event: hide it, or bring it back. */
function EventIntervention({ eventId }: { eventId: string }) {
  const query = useQuery(adminEventQueryOptions(eventId))
  if (!query.data) return <AdminState query={query} />
  return <EventModeration detail={query.data} />
}

/**
 * #239 from a report about a person: block the reporter and the reported
 * from each other. Neither of them learns of it.
 */
function PairIntervention({ report }: { report: Detail }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const block = useBlockUser(report.reporter.id)

  return (
    <AdminSection title={t("admin.reports.intervention.pairTitle")}>
      <p className="typo-body text-muted-foreground">
        {t("admin.reports.intervention.pairText", {
          reporter: report.reporter.name,
          target: report.target.name,
        })}
      </p>
      <div>
        <Button
          variant="outline"
          onClick={() => {
            block.reset()
            setIsOpen(true)
          }}
        >
          {t("admin.reports.intervention.blockPair")}
        </Button>
      </div>
      <BlockUserSheet
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        user={report.reporter}
        otherUser={{ id: report.target.id, name: report.target.name }}
        isPending={block.isPending}
        error={block.error}
        onSubmit={async (values) => {
          await block.mutateAsync(values)
          setIsOpen(false)
          toast.success(t("admin.blocks.blocked"))
        }}
      />
    </AdminSection>
  )
}

/** #240, #73, ADR-0023: one report with what to do about it. */
export function AdminReportDetail({ reportId }: { reportId: string }) {
  const { t } = useTranslation()
  const format = useAdminFormat()
  const query = useQuery(adminReportQueryOptions(reportId))
  if (!query.data) return <AdminState query={query} />

  const report = query.data

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="typo-h1 text-foreground">
          {t(`admin.reports.detailTitle.${report.target.type}`, { name: report.target.name })}
        </h1>
        <span>
          <ReportStatusBadge status={report.status} />
        </span>
      </div>

      <AdminSection title={t("admin.reports.basics")}>
        <AdminFacts
          facts={[
            {
              label: t("admin.reports.target"),
              value: <ReportTargetLink target={report.target} />,
            },
            { label: t("admin.reports.reason"), value: report.reason.name },
            {
              label: t("admin.reports.reporter"),
              value: (
                <AdminLink to={{ kind: "user", id: report.reporter.id }}>
                  {report.reporter.name}
                </AdminLink>
              ),
            },
            { label: t("admin.reports.createdAt"), value: format.dateTime(report.createdAt) },
            { label: t("admin.reports.assignee"), value: report.assignee?.name ?? null },
            ...(report.status === "RESOLVED"
              ? [
                  {
                    label: t("admin.reports.resolvedAt"),
                    value: report.resolvedAt ? format.dateTime(report.resolvedAt) : null,
                  },
                  {
                    label: t("admin.reports.resolutionNote"),
                    value: <span className="whitespace-pre-line">{report.resolutionNote}</span>,
                  },
                ]
              : []),
          ]}
        />
      </AdminSection>

      <AdminSection title={t("admin.reports.text")}>
        <p className="typo-body break-words whitespace-pre-line text-foreground">{report.text}</p>
      </AdminSection>

      <ReportSteps report={report} />

      {report.target.type === "EVENT" ? (
        <EventIntervention eventId={report.target.id} />
      ) : (
        <PairIntervention report={report} />
      )}

      <AdminSection title={t("admin.reports.otherOpenTitle")}>
        {report.otherOpenReports.length === 0 ? (
          <p className="typo-body text-muted-foreground">{t("admin.reports.otherOpenEmpty")}</p>
        ) : (
          <AdminReportsTable
            label={t("admin.reports.otherOpenTitle")}
            rows={report.otherOpenReports}
          />
        )}
      </AdminSection>

      <AdminSection title={t("admin.reports.history.title")}>
        <ol className="flex flex-col gap-3">
          {report.history.map((entry, index) => (
            <li
              key={`${entry.action}-${index}`}
              className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0"
            >
              <p className="typo-body text-foreground">
                {t(`admin.reports.history.${entry.action}`, {
                  admin: entry.admin?.name ?? "",
                  reporter: report.reporter.name,
                  assignee: entry.description ?? "",
                })}
              </p>
              {entry.action === "RESOLVED" && entry.description ? (
                <p className="typo-small break-words whitespace-pre-line text-muted-foreground">
                  {entry.description}
                </p>
              ) : null}
              <p className="typo-caption text-muted-foreground">{format.dateTime(entry.at)}</p>
            </li>
          ))}
        </ol>
      </AdminSection>
    </div>
  )
}
