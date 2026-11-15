import { useTranslation } from "react-i18next"

import { NoMatchingResults } from "@/components/hobbyhub/NoMatchingResults"

/** The empty state of a filtered event listing: nothing matches, with a way out. */
export function NoMatchingEvents({ onClearFilters }: { onClearFilters?: () => void }) {
  const { t } = useTranslation()

  return (
    <NoMatchingResults
      title={t("events.list.emptyFiltered.title")}
      description={t("events.list.emptyFiltered.description")}
      clearLabel={t("events.list.emptyFiltered.clear")}
      onClearFilters={onClearFilters}
    />
  )
}
