import { z } from "zod"

// #240, ADR-0023: the same limits as the server's `domain/report.ts`.
export const REPORT_TEXT_MIN = 10
export const REPORT_TEXT_MAX = 500

export const reportTargetTypeSchema = z.enum(["EVENT", "USER"])
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>

export type ReportTarget = { type: ReportTargetType; id: string }

export const reportReasonSchema = z.object({ id: z.string(), name: z.string() })
export const reportReasonsSchema = z.array(reportReasonSchema)
export type ReportReason = z.infer<typeof reportReasonSchema>

/** What the reporter gets back: that it arrived, nothing more. */
export const filedReportSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
})
export type FiledReport = z.infer<typeof filedReportSchema>

export type FileReportInput = {
  target: ReportTarget
  reasonId: string
  text: string
}

// Why the server refuses a report (ReportViolation on the server).
export const reportViolationSchema = z.enum([
  "SELF",
  "OWN_EVENT",
  "UNKNOWN_REASON",
  "ALREADY_REPORTED",
])
export type ReportViolation = z.infer<typeof reportViolationSchema>

export const reportRefusalSchema = z.object({ violations: z.array(reportViolationSchema).min(1) })
