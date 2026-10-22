import { useId, type ComponentProps } from "react"
import { useTranslation } from "react-i18next"

import FiltersIcon from "@/assets/ui-icons/filters.svg?react"
import SearchIcon from "@/assets/ui-icons/search.svg?react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SearchFieldProps = Omit<ComponentProps<"input">, "type"> & {
  /** Accessible name of the field; the design shows no visible label. */
  label?: string
  onOpenFilters?: () => void
}

/**
 * Vyhledávání — pill search field with an optional filters button. The focus
 * ring sits on the whole pill, so it stays visible around both controls.
 */
export function SearchField({ label, onOpenFilters, className, ...props }: SearchFieldProps) {
  const { t } = useTranslation()
  const id = useId()

  return (
    <div
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-full border border-border bg-card px-4 transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
    >
      <label
        htmlFor={id}
        className="sr-only"
      >
        {label ?? t("hobbyhub.search.label")}
      </label>
      <SearchIcon
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground"
      />
      <input
        id={id}
        type="search"
        className="min-w-0 flex-1 bg-transparent typo-body-lg text-foreground outline-none placeholder:text-muted-foreground md:typo-body"
        {...props}
      />
      {onOpenFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("hobbyhub.search.filters")}
          onClick={onOpenFilters}
          className="-mr-2 rounded-full text-foreground"
        >
          <FiltersIcon className="size-5" />
        </Button>
      ) : null}
    </div>
  )
}
