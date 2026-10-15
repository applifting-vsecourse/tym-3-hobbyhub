import { useState, type ReactNode } from "react"

import { ACTIVITIES } from "@/components/hobbyhub/ActivityIcon"
import { EMPTY_FILTERS, FiltersSheet, type EventFilters } from "@/components/hobbyhub/FiltersSheet"
import { SearchField } from "@/components/hobbyhub/SearchField"
import { ShareEventSheet } from "@/components/hobbyhub/ShareEventSheet"
import { Button } from "@/components/ui/button"

import { Example, ShowcaseSection } from "@/features/design-system/components/ShowcaseSection"

const SAMPLE_EVENT = {
  message: "Čtvrtek florbal, chybí 1. Potvrď, jestli jdeš:",
  url: "https://hobbyhub.cz/akce/ctvrtecni-florbal",
  description:
    "Chybí 1 člověk do minima. Pošli zprávu do skupiny, kde už jste, a zbytek vyřeší odkaz.",
}

// Made-up counts so the button label reacts to the draft, as it will with real data.
function sampleCount(filters: EventFilters) {
  const byActivity = filters.activities.length > 0 ? filters.activities.length * 6 : 24
  return filters.when ? Math.ceil(byActivity / 2) : byActivity
}

const WHEN_LABELS = { week: "tento týden", weekend: "víkend", date: "vlastní datum" } as const

function describeFilters(filters: EventFilters) {
  const parts = [
    ...filters.activities.map((activity) => ACTIVITIES[activity].label),
    filters.when ? WHEN_LABELS[filters.when] : "",
    filters.location,
  ].filter((part) => part !== "")
  return parts.length > 0 ? parts.join(", ") : "žádné"
}

/** Search field whose filter button opens the filters panel. */
export function SearchWithFilters() {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS)

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <SearchField
        placeholder="Florbal, Praha 8"
        onOpenFilters={() => setIsOpen(true)}
      />
      <p className="typo-small text-muted-foreground">Použité filtry: {describeFilters(filters)}</p>
      <FiltersSheet
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        value={filters}
        onApply={setFilters}
        countResults={sampleCount}
      />
    </div>
  )
}

/** Share panel behind any trigger, e.g. the "Sdílet do chatu" button of a free seat. */
export function ShareEventDemo({ trigger }: { trigger: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <ShareEventSheet
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      trigger={trigger}
      {...SAMPLE_EVENT}
    />
  )
}

export function SheetSection() {
  return (
    <ShowcaseSection
      id="spodni-panel"
      title="Spodní panel (drawer)"
      description="Vedlejší úkoly, které nechávají stránku pod sebou — filtry a sdílení akce. Na telefonu vyjede zespodu a jde stáhnout dolů, od šířky md se otevře jako dialog. Primární akce je dole přes celou šířku."
    >
      <Example label="Filtry — otevře tlačítko filtrů ve vyhledávání">
        <SearchWithFilters />
      </Example>
      <Example label="Sdílet do chatu">
        <ShareEventDemo trigger={<Button variant="outline">Sdílet akci</Button>} />
      </Example>
    </ShowcaseSection>
  )
}
