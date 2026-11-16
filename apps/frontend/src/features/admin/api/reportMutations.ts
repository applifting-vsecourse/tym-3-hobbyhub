import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HTTPError } from "ky"

import { adminKeys } from "@/features/admin/api/adminKeys"
import {
  adminReportDetailSchema,
  reportRefusalSchema,
  type AdminReportDetail,
  type ReportTransitionViolation,
} from "@/features/admin/api/reportSchemas"
import { adminApi } from "@/features/admin/lib/admin-api"

/** The server refused a step, e.g. a colleague changed the report meanwhile. */
export class ReportRefusedError extends Error {
  constructor(readonly violations: ReportTransitionViolation[]) {
    super(violations.join(", "))
    this.name = "ReportRefusedError"
  }
}

async function withRefusal(send: () => Promise<unknown>): Promise<AdminReportDetail> {
  try {
    return adminReportDetailSchema.parse(await send())
  } catch (error) {
    if (error instanceof HTTPError && [400, 409].includes(error.response.status)) {
      // ky has already read the body into `error.data`.
      const refusal = reportRefusalSchema.safeParse(error.data)
      if (refusal.success) throw new ReportRefusedError(refusal.data.violations)
    }
    throw error
  }
}

/**
 * #240: a step changes the report, the queue, the count in the navigation
 * and the report sections of the user and event details. After a refusal too:
 * it usually means the report changed meanwhile.
 */
function useReportStep<TInput>(reportId: string, send: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TInput) => withRefusal(() => send(input)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.report(reportId) }),
        queryClient.invalidateQueries({ queryKey: [...adminKeys.all(), "reports"] }),
        queryClient.invalidateQueries({ queryKey: adminKeys.newReportsCount() }),
        queryClient.invalidateQueries({ queryKey: [...adminKeys.all(), "user"] }),
        queryClient.invalidateQueries({ queryKey: [...adminKeys.all(), "event"] }),
      ]),
  })
}

/** Without an administrator the signed-in one takes the report over. */
export const useAssignReport = (reportId: string) =>
  useReportStep(reportId, (input: { administratorId?: string }) =>
    adminApi.post(`reports/${reportId}/assign`, { json: input }).json(),
  )

export const useResolveReport = (reportId: string) =>
  useReportStep(reportId, (input: { note: string }) =>
    adminApi.post(`reports/${reportId}/resolve`, { json: input }).json(),
  )

export const useReopenReport = (reportId: string) =>
  useReportStep(reportId, () => adminApi.post(`reports/${reportId}/reopen`).json())
