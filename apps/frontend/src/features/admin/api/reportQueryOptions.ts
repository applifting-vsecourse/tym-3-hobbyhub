import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { adminKeys } from "@/features/admin/api/adminKeys"
import {
  adminReportDetailSchema,
  adminReportListItemSchema,
  adminReportPageSchema,
  adminUserReportsSchema,
  reportCountSchema,
  type AdminReportFilter,
} from "@/features/admin/api/reportSchemas"
import { adminApi } from "@/features/admin/lib/admin-api"

// #240, #73, ADR-0023.

export const adminReportsQueryOptions = (filter: AdminReportFilter) =>
  queryOptions({
    queryKey: adminKeys.reports(filter),
    queryFn: async () =>
      adminReportPageSchema.parse(
        await adminApi
          .get("reports", {
            searchParams: {
              status: filter.status,
              ...(filter.targetType ? { targetType: filter.targetType } : {}),
              ...(filter.mine ? { mine: true } : {}),
              offset: filter.offset,
            },
          })
          .json(),
      ),
    placeholderData: keepPreviousData,
  })

export const adminReportQueryOptions = (id: string) =>
  queryOptions({
    queryKey: adminKeys.report(id),
    queryFn: async () => adminReportDetailSchema.parse(await adminApi.get(`reports/${id}`).json()),
  })

/** The count in the navigation: kept fresh while the administration is open. */
export const newReportsCountQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.newReportsCount(),
    queryFn: async () =>
      reportCountSchema.parse(await adminApi.get("reports/new-count").json()).count,
    refetchInterval: 60 * 1000,
  })

export const adminUserReportsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: adminKeys.userReports(userId),
    queryFn: async () =>
      adminUserReportsSchema.parse(await adminApi.get(`users/${userId}/reports`).json()),
  })

export const adminEventReportsQueryOptions = (eventId: string) =>
  queryOptions({
    queryKey: adminKeys.eventReports(eventId),
    queryFn: async () =>
      z
        .array(adminReportListItemSchema)
        .parse(await adminApi.get(`events/${eventId}/reports`).json()),
  })
