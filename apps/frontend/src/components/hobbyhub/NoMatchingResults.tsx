import SearchIcon from "@/assets/ui-icons/search.svg?react"
import { Button } from "@/components/ui/button"

type NoMatchingResultsProps = {
  title: string
  description: string
  clearLabel: string
  onClearFilters?: () => void
}

/** The empty state of a filtered listing: nothing matches, with a way out. */
export function NoMatchingResults({
  title,
  description,
  clearLabel,
  onClearFilters,
}: NoMatchingResultsProps) {
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
      <h2 className="typo-h3 text-foreground">{title}</h2>
      <p className="typo-body text-muted-foreground">{description}</p>
      {onClearFilters ? (
        <Button
          variant="outline"
          className="mt-3 w-full sm:w-auto"
          onClick={onClearFilters}
        >
          {clearLabel}
        </Button>
      ) : null}
    </div>
  )
}
