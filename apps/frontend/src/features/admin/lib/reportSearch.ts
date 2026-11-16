import { z } from "zod"

import {
  reportStatusFilterSchema,
  reportTargetTypeSchema,
  type AdminReportFilter,
} from "@/features/admin/api/reportSchemas"

/** `?status=&target=&mine=&offset=` of the queue; anything odd falls back. */
export const reportSearchSchema = z.object({
  status: reportStatusFilterSchema.optional().catch(undefined),
  target: reportTargetTypeSchema.optional().catch(undefined),
  mine: z.boolean().optional().catch(undefined),
  offset: z.number().int().min(0).optional().catch(undefined),
})

export type ReportSearch = z.infer<typeof reportSearchSchema>

export const toReportFilter = (search: ReportSearch): AdminReportFilter => ({
  status: search.status ?? "OPEN",
  targetType: search.target,
  mine: search.mine ?? false,
  offset: search.offset ?? 0,
})

/** The URL keeps only what differs from everyone's open reports, first page. */
export const toReportSearch = (filter: AdminReportFilter): ReportSearch => ({
  status: filter.status === "OPEN" ? undefined : filter.status,
  target: filter.targetType,
  mine: filter.mine || undefined,
  offset: filter.offset || undefined,
})
