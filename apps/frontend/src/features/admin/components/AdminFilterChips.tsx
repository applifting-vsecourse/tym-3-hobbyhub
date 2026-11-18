import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

type AdminFilterChipsProps<T extends string> = {
  /** Names the group for assistive technology, e.g. "Filtr uživatelů". */
  label: string
  /** The chosen filter; undefined is "all". */
  value: T | undefined
  /** "Vše" first, then the filters; undefined is the one that clears. */
  options: { value: T | undefined; label: string }[]
  onChange: (value: T | undefined) => void
}

/**
 * #271: the smart filters of a list, one click each. One is on at a time; the
 * first, "all", is the list as it was. Buttons, not links: the list's own
 * route puts the choice into the address.
 */
export function AdminFilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: AdminFilterChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const isOn = option.value === value
        return (
          <button
            key={option.value ?? "all"}
            type="button"
            aria-pressed={isOn}
            data-state={isOn ? "on" : "off"}
            className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
