import type { ComponentProps } from "react"

import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

type FilterChipProps = Omit<ComponentProps<typeof Toggle>, "variant" | "size">

/** Filtr — a toggle chip under the search field ("Chybí lidé", "Tento týden"…). */
export function FilterChip({ className, ...props }: FilterChipProps) {
  return (
    <Toggle
      variant="chip"
      className={cn("h-11 px-3 md:h-9", className)}
      {...props}
    />
  )
}
