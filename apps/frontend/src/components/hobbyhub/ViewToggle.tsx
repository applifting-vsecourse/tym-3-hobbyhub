import { useTranslation } from "react-i18next"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export type EventsView = "map" | "list"

type ViewToggleProps = {
  value: EventsView
  onValueChange: (value: EventsView) => void
  className?: string
}

/** Přepínač Mapa / Seznam — switches the event listing between map and list. */
export function ViewToggle({ value, onValueChange, className }: ViewToggleProps) {
  const { t } = useTranslation()

  return (
    <ToggleGroup
      type="single"
      variant="segment"
      spacing={1}
      value={value}
      // Radix lets a single group deselect; a view switch always has a view.
      onValueChange={(next) => {
        if (next) onValueChange(next as EventsView)
      }}
      aria-label={t("hobbyhub.viewToggle.label")}
      className={cn("h-11 w-65 rounded-full bg-muted p-1", className)}
    >
      <ToggleGroupItem
        value="map"
        className="h-full flex-1"
      >
        {t("hobbyhub.viewToggle.map")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="list"
        className="h-full flex-1"
      >
        {t("hobbyhub.viewToggle.list")}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
