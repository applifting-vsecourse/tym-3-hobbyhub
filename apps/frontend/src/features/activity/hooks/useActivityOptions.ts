import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import type { ActivityComboboxOption } from "@/components/hobbyhub/ActivityCombobox"
import type { FilterActivitiesState } from "@/components/hobbyhub/FiltersSheet"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"

/** The activities as a filter offers them: translated, and the state of their request. */
export function useActivityOptions(): {
  options: ActivityComboboxOption[]
  state: FilterActivitiesState
} {
  const { t } = useTranslation()
  const query = useQuery(activitiesQueryOptions())
  const options = useMemo(
    () =>
      (query.data ?? []).map((item) => ({
        id: item.id,
        label: activityName(t, item),
        icon: item.icon,
      })),
    [query.data, t],
  )
  return {
    options,
    state: {
      isLoading: query.isPending,
      error: query.error,
      onRetry: () => void query.refetch(),
    },
  }
}
