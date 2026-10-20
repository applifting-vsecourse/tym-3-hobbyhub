import { useId, useState, type ComponentProps } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ActivityComboboxOption = {
  id: string
  /** Already translated; shown and searched. */
  label: string
  /** Key of the icon in `ACTIVITIES`; unknown keys get no icon. */
  icon: string
}

// "sachy" finds "Šachy": compare without accents or case.
const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase()
const matches = (value: string, search: string) => (fold(value).includes(fold(search)) ? 1 : 0)

type ActivityComboboxProps = Omit<ComponentProps<"button">, "value" | "onChange"> & {
  options: ActivityComboboxOption[]
  /** Id of the chosen option, or "" for none. */
  value: string
  onValueChange: (id: string) => void
  /** Shown on the trigger while nothing is chosen. */
  placeholder: string
}

/**
 * Výběr aktivity — a combobox over the activity lookup: the trigger looks like
 * a select, the list filters as you type. Filtering is client-side; the whole
 * lookup is already loaded.
 */
export function ActivityCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  className,
  ...buttonProps
}: ActivityComboboxProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const listId = useId()
  const selected = options.find((option) => option.id === value)

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3.5 py-3 typo-body text-foreground transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            className,
          )}
          {...buttonProps}
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-2 truncate",
              !selected && "text-muted-foreground",
            )}
          >
            {selected && isActivityKey(selected.icon) ? (
              <ActivityIcon
                activity={selected.icon}
                className="size-5 shrink-0"
              />
            ) : null}
            {selected?.label ?? placeholder}
          </span>
          <ChevronDownIcon
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command filter={matches}>
          <CommandInput placeholder={t("hobbyhub.activityCombobox.search")} />
          <CommandList id={listId}>
            <CommandEmpty>{t("hobbyhub.activityCombobox.noMatch")}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.id)
                    setIsOpen(false)
                  }}
                >
                  {isActivityKey(option.icon) ? (
                    <ActivityIcon
                      activity={option.icon}
                      className="size-5"
                    />
                  ) : null}
                  {option.label}
                  <CheckIcon
                    aria-hidden
                    className={cn(
                      "ml-auto size-4",
                      option.id === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
