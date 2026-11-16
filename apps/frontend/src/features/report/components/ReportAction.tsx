import { useState } from "react"
import type { TFunction } from "i18next"
import { Flag } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { ReportRefusedError } from "@/features/report/api/fileReport"
import type { ReportTarget } from "@/features/report/api/reportSchemas"
import { ReportSheet, type ReportFormValues } from "@/features/report/components/ReportSheet"
import { useFileReport } from "@/features/report/hooks/useFileReport"
import { useReportReasons } from "@/features/report/hooks/useReportReasons"

type ReportActionProps = {
  readonly target: ReportTarget
  /** The event's title or the person's name, for the sheet. */
  readonly targetName: string
}

/** What went wrong, in words the reporter can act on. */
function errorMessageOf(t: TFunction, error: unknown): string {
  if (error instanceof ReportRefusedError) {
    if (error.violations.includes("ALREADY_REPORTED")) return t("reports.errors.alreadyReported")
    if (error.violations.includes("UNKNOWN_REASON")) return t("reports.errors.unknownReason")
    return t("reports.errors.notAllowed")
  }
  if (error instanceof HTTPError && error.response.status === 404) {
    return t("reports.errors.notFound")
  }
  return t("reports.errors.failed")
}

/**
 * #240, ADR-0023: "Nahlásit" under an event or on a person's profile. The
 * page shows it only to a signed-in person who may report the target; the
 * server decides again.
 */
export function ReportAction({ target, targetName }: ReportActionProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const reasonsQuery = useReportReasons(isOpen)
  const fileReport = useFileReport()
  const kind = target.type === "EVENT" ? "event" : "user"

  const handleSubmit = async (values: ReportFormValues) => {
    await fileReport.mutateAsync({
      target,
      reasonId: values.reasonId,
      text: values.text.trim(),
    })
    setIsOpen(false)
    toast.success(t("reports.done"))
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="self-start"
        onClick={() => {
          fileReport.reset()
          setIsOpen(true)
        }}
      >
        <Flag aria-hidden />
        {t(`reports.${kind}.action`)}
      </Button>
      <ReportSheet
        targetType={target.type}
        targetName={targetName}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        reasons={reasonsQuery.data ?? []}
        isReasonsLoading={reasonsQuery.isPending}
        isReasonsError={reasonsQuery.isError}
        onRetryReasons={() => void reasonsQuery.refetch()}
        isSubmitting={fileReport.isPending}
        errorMessage={fileReport.isError ? errorMessageOf(t, fileReport.error) : null}
        onSubmit={handleSubmit}
      />
    </>
  )
}
