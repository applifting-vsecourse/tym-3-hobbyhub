import { z } from "zod"

// #240, #73, ADR-0023: reports as the administration sees them.

/** Like the server's REPORT_RESOLUTION_NOTE_*_LENGTH. */
export const REPORT_RESOLUTION_NOTE_MIN_LENGTH = 10
export const REPORT_RESOLUTION_NOTE_MAX_LENGTH = 500

export const reportStatusSchema = z.enum(["NEW", "IN_PROGRESS", "RESOLVED"])
export type ReportStatus = z.infer<typeof reportStatusSchema>

/** What the queue filters by: OPEN is new and in progress. */
export const reportStatusFilterSchema = z.enum(["OPEN", "NEW", "IN_PROGRESS", "RESOLVED", "ALL"])
export type ReportStatusFilter = z.infer<typeof reportStatusFilterSchema>
export const REPORT_STATUS_FILTERS = reportStatusFilterSchema.options

export const reportTargetTypeSchema = z.enum(["EVENT", "USER"])
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>
export const REPORT_TARGET_TYPES = reportTargetTypeSchema.options

const refSchema = z.object({ id: z.string(), name: z.string() })

export const adminReportSummarySchema = z.object({
  id: z.string(),
  status: reportStatusSchema,
  createdAt: z.coerce.date(),
  target: z.object({ type: reportTargetTypeSchema, id: z.string(), name: z.string() }),
  reason: refSchema,
  reporter: refSchema,
  assignee: refSchema.nullable(),
})
export type AdminReportSummary = z.infer<typeof adminReportSummarySchema>

export const adminReportListItemSchema = adminReportSummarySchema.extend({
  otherOpenReports: z.number(),
})
export type AdminReportListItem = z.infer<typeof adminReportListItemSchema>

export const adminReportPageSchema = z.object({
  items: z.array(adminReportListItemSchema),
  total: z.number(),
})

export const reportHistoryActionSchema = z.enum(["CREATED", "ASSIGNED", "RESOLVED", "REOPENED"])

export const adminReportDetailSchema = adminReportSummarySchema.extend({
  text: z.string(),
  resolutionNote: z.string().nullable(),
  resolvedAt: z.coerce.date().nullable(),
  otherOpenReports: z.array(adminReportSummarySchema),
  history: z.array(
    z.object({
      action: reportHistoryActionSchema,
      at: z.coerce.date(),
      admin: refSchema.nullable(),
      description: z.string().nullable(),
    }),
  ),
})
export type AdminReportDetail = z.infer<typeof adminReportDetailSchema>

export const adminUserReportsSchema = z.object({
  about: z.array(adminReportListItemSchema),
  filed: z.array(adminReportListItemSchema),
})

export const reportCountSchema = z.object({ count: z.number() })

// Why the server refused a step of the queue (400, or 409 for CHANGED).
export const reportTransitionViolationSchema = z.enum([
  "ALREADY_RESOLVED",
  "NOT_RESOLVED",
  "ALREADY_ASSIGNED",
  "ASSIGNEE_NOT_ACTIVE",
  "CHANGED",
])
export type ReportTransitionViolation = z.infer<typeof reportTransitionViolationSchema>

export const reportRefusalSchema = z.object({
  violations: z.array(reportTransitionViolationSchema).min(1),
})

export type AdminReportFilter = {
  status: ReportStatusFilter
  targetType?: ReportTargetType
  mine: boolean
  offset: number
}
