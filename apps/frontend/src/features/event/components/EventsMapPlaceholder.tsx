import { useTranslation } from "react-i18next"

// Stand-in until the map (F-02.2 #6) exists.
export function EventsMapPlaceholder() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-96 items-center justify-center rounded-xl bg-muted p-6 typo-body text-muted-foreground lg:sticky lg:top-20 lg:h-[calc(100svh-7rem)]">
      {t("events.map.placeholder")}
    </div>
  )
}
