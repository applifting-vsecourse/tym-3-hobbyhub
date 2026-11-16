import type { ComponentProps, ReactNode } from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type ComboboxTriggerProps = Omit<ComponentProps<"button">, "type" | "role" | "children"> & {
  readonly isOpen: boolean
  /** Id of the list the trigger opens (`CommandList`). */
  readonly listId: string
  /** Muted while nothing is picked, so the placeholder reads as one. */
  readonly isEmpty: boolean
  readonly children: ReactNode
}

/**
 * The button that opens a combobox (`Popover` + `Command`): looks like a form
 * field, with a chevron. The one implementation every combobox shares, so the
 * field look, the focus ring and the ARIA wiring live in a single place.
 * Wrap it in `PopoverTrigger asChild`.
 */
export function ComboboxTrigger({
  isOpen,
  listId,
  isEmpty,
  className,
  children,
  ...buttonProps
}: ComboboxTriggerProps) {
  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={isOpen}
      aria-controls={listId}
      className={cn(
        "flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3.5 py-3 typo-body text-foreground transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...buttonProps}
    >
      <span className={cn("flex min-w-0 items-center gap-2", isEmpty && "text-muted-foreground")}>
        {children}
      </span>
      <ChevronDownIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </button>
  )
}
