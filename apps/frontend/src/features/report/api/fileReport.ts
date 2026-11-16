import { api, HTTPError } from "@/lib/api-client"

import {
  filedReportSchema,
  reportRefusalSchema,
  type FiledReport,
  type FileReportInput,
  type ReportViolation,
} from "@/features/report/api/reportSchemas"

/** The server refused the report for a reason the sheet can explain. */
export class ReportRefusedError extends Error {
  constructor(readonly violations: ReportViolation[]) {
    super(violations.join(", "))
    this.name = "ReportRefusedError"
  }
}

/** #240: report an event, or a user and ask for the two to be blocked from each other. */
export async function fileReport({
  target,
  reasonId,
  text,
}: FileReportInput): Promise<FiledReport> {
  try {
    const json = await api
      .post("reports", { json: { targetType: target.type, targetId: target.id, reasonId, text } })
      .json()
    return filedReportSchema.parse(json)
  } catch (error) {
    // ky has already read the body into `error.data`.
    if (error instanceof HTTPError && [400, 409].includes(error.response.status)) {
      const refusal = reportRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new ReportRefusedError(refusal.data.violations)
    }
    throw error
  }
}
