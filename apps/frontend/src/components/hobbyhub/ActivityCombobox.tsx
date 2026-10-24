import { useId, useMemo, useState, type ComponentProps } from "react"
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

// "sachy" finds "Šachy": compare without accents or case. Items are keyed by id,
// so two "Neznámá aktivita" rows stay apart; the label is searched as a keyword.
const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase()
const matches = (_id: string, search: string, keywords: string[] = []) =>
  keywords.some((keyword) => fold(keyword).includes(fold(search))) ? 1 : 0

type ActivityComboboxProps = Omit<ComponentProps<"button">, "value" | "onChange"> & {
  options: ActivityComboboxOption[]
  /** Shown on the trigger while nothing is chosen. */
  placeholder: string
} & (
    | {
        isMultiple?: false
        /** Id of the chosen option, or "" for none. */
        value: string
        onValueChange: (id: string) => void
      }
    | {
        /** Several may be chosen: the list stays open and a second pick removes one. */
        isMultiple: true
        /** Ids of the chosen options; [] for none. */
        value: string[]
        onValueChange: (ids: string[]) => void
      }
  )

/**
 * Výběr aktivity — a combobox over the activity lookup: the trigger looks like
 * a select, the list filters as you type. Filtering is client-side; the whole
 * lookup is already loaded. Forms pick one activity, filters (`isMultiple`) any.
 * Options come in any order; the list shows them alphabetically.
 */
export function ActivityCombobox({
  options,
  isMultiple,
  value,
  onValueChange,
  placeholder,
  className,
  ...buttonProps
}: ActivityComboboxProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const [isOpen, setIsOpen] = useState(false)
  const listId = useId()
  const chosenIds = isMultiple ? value : value ? [value] : []
  const isChosen = (id: string) => chosenIds.includes(id)

  // With dozens of activities the list is scanned by name. Sorted in the app's
  // language, not the browser's: Czech puts "Ch" after "H".
  const sortedOptions = useMemo(() => {
    const collator = new Intl.Collator(language)
    return [...options].sort((a, b) => collator.compare(a.label, b.label))
  }, [options, language])
  // A chosen id the options do not know (a retired activity, an id typed into
  // the address) is listed first, so whatever it filters can be seen and removed.
  const unknownOptions = chosenIds
    .filter((id) => !options.some((option) => option.id === id))
    .map((id) => ({ id, label: t("hobbyhub.activityCombobox.unknown"), icon: "" }))
  const listedOptions = [...unknownOptions, ...sortedOptions]
  const selected = listedOptions.filter((option) => isChosen(option.id))
  const [onlySelected] = selected.length === 1 ? selected : []

  const choose = (id: string) => {
    if (isMultiple) {
      onValueChange(isChosen(id) ? value.filter((chosen) => chosen !== id) : [...value, id])
      return
    }
    onValueChange(id)
    setIsOpen(false)
  }

  return (
    // Modal, so the list scrolls inside a dialog or drawer: their scroll lock
    // swallows wheel and touch events in a non-modal popover's portal.
    <Popover
      modal
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
              "flex min-w-0 items-center gap-2",
              selected.length === 0 && "text-muted-foreground",
            )}
          >
            {onlySelected && isActivityKey(onlySelected.icon) ? (
              <ActivityIcon
                activity={onlySelected.icon}
                className="size-5 shrink-0"
              />
            ) : null}
            {/* Two or more as a count: a list of names would be cut off on a phone. */}
            <span className="truncate">
              {onlySelected
                ? onlySelected.label
                : selected.length > 1
                  ? t("hobbyhub.activityCombobox.selected", { count: selected.length })
                  : placeholder}
            </span>
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
              {listedOptions.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  keywords={[option.label]}
                  // cmdk uses `aria-selected` for the highlighted row; the chosen ones carry `aria-checked`.
                  aria-checked={isChosen(option.id)}
                  onSelect={() => choose(option.id)}
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
                      isChosen(option.id) ? "opacity-100" : "opacity-0",
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
