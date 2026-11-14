import { useTranslation } from "react-i18next"

import SearchIcon from "@/assets/ui-icons/search.svg?react"
import { Button } from "@/components/ui/button"

/** The empty state of a filtered group list: nothing matches, with a way out. */
export function NoMatchingGroups({ onClearFilters }: { onClearFilters: () => void }) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 py-12 text-center"
    >
      <div
        aria-hidden
        className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-foreground"
      >
        <SearchIcon className="size-8" />
      </div>
      <h2 className="typo-h3 text-foreground">{t("groups.list.emptyFiltered.title")}</h2>
      <p className="typo-body text-muted-foreground">
        {t("groups.list.emptyFiltered.description")}
      </p>
      <Button
        variant="outline"
        className="mt-3 w-full sm:w-auto"
        onClick={onClearFilters}
      >
        {t("groups.list.emptyFiltered.clear")}
      </Button>
    </div>
  )
}
