import { useId, useMemo, useState, type ComponentProps, type ReactNode } from "react"
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  ActivityIcon,
  CategoryIcon,
  isActivityKey,
  isCategoryKey,
} from "@/components/hobbyhub/ActivityIcon"
import { ActivityToken } from "@/components/hobbyhub/ActivityToken"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

/** Main category of an activity (ADR-0020), as the activity lookup sends it. */
export type ActivityComboboxCategory = {
  id: string
  /** Czech name from the server; shown when the key has no translation. */
  name: string
  /** Key of the category in `CATEGORIES`: its icon and translation. */
  icon: string
  /** Position of the category in the list. */
  order: number
}

export type ActivityComboboxOption = {
  id: string
  /** Already translated; shown and searched. */
  label: string
  /** Key of the icon in `ACTIVITIES`; unknown keys get no icon. */
  icon: string
  /** Lets the list be browsed by category; searched as well. */
  category?: ActivityComboboxCategory
}

type CategoryGroup = {
  id: string
  /** Translated name of the category. */
  label: string
  icon: string
  options: ActivityComboboxOption[]
}

// "sachy" finds "Šachy": compare without accents or case. Items are keyed by id,
// so two "Neznámá aktivita" rows stay apart; the label is searched as a keyword.
const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase()
const matches = (_id: string, search: string, keywords: string[] = []) =>
  keywords.some((keyword) => fold(keyword).includes(fold(search))) ? 1 : 0

// Rows that are not activities carry a prefix, so their values never clash with an id.
const CATEGORY_ROW = "category:"
const ALL_ROW = "all:"
const BACK_ROW = "back"

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
        /** Several may be chosen: the list stays open, a second pick removes one, a whole category can be chosen. */
        isMultiple: true
        /** Ids of the chosen options; [] for none. */
        value: string[]
        onValueChange: (ids: string[]) => void
      }
  )

/**
 * Výběr aktivity — a combobox over the activity lookup. Filtering is
 * client-side; the whole lookup is already loaded. Forms pick one activity,
 * filters (`isMultiple`) any, and a whole category at once.
 *
 * When the options carry categories (ADR-0020) the list is browsed by them: on
 * a computer two columns in a popover (categories, then the activities of the
 * one pointed at), on a phone a bottom drawer that steps into a category and
 * back. Typing shows one list of matches from every category, each with its
 * category underneath. Without categories it is a plain alphabetical list.
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
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  // The category whose activities are shown: the right column, or the step on a phone.
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  // The highlighted row, held here so the list opens on the active category's row.
  const [highlighted, setHighlighted] = useState("")
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
  const unknownOptions: ActivityComboboxOption[] = chosenIds
    .filter((id) => !options.some((option) => option.id === id))
    .map((id) => ({ id, label: t("hobbyhub.activityCombobox.unknown"), icon: "" }))
  const listedOptions = [...unknownOptions, ...sortedOptions]
  const selected = listedOptions.filter((option) => isChosen(option.id))

  const categoryLabel = (category: ActivityComboboxCategory) =>
    isCategoryKey(category.icon) ? t(`hobbyhub.activityCategories.${category.icon}`) : category.name
  const categories: CategoryGroup[] = (() => {
    const byId = new Map<string, { order: number; group: CategoryGroup }>()
    for (const option of sortedOptions) {
      const { category } = option
      if (!category) continue
      const entry = byId.get(category.id) ?? {
        order: category.order,
        group: {
          id: category.id,
          label: categoryLabel(category),
          icon: category.icon,
          options: [],
        },
      }
      entry.group.options.push(option)
      byId.set(category.id, entry)
    }
    return [...byId.values()].sort((a, b) => a.order - b.order).map(({ group }) => group)
  })()
  // Browsed by category only when every known option has one.
  const isByCategory = categories.length > 0 && sortedOptions.every((option) => option.category)
  const isBrowsing = isByCategory && search.trim() === ""
  // Unknown ids and options outside any category, listed above the categories.
  const looseOptions = isByCategory ? unknownOptions : listedOptions
  const activeCategory = categories.find((category) => category.id === activeCategoryId)
  const categoryOf = (id: string) => categories.find((c) => c.options.some((o) => o.id === id))
  const isWholeCategory = (category: CategoryGroup) =>
    category.options.every((option) => isChosen(option.id))
  const chosenIn = (category: CategoryGroup) =>
    category.options.filter((option) => isChosen(option.id)).length

  // Opening starts on the category of the first chosen activity, else the first
  // category: on a computer its activities are on the right, on a phone the
  // drawer starts on the list of categories.
  const open = (isOpening: boolean) => {
    setIsOpen(isOpening)
    if (!isOpening) return
    setSearch("")
    const first = selected.map((option) => categoryOf(option.id)).find(Boolean)
    const start = isDesktop ? ((first ?? categories[0])?.id ?? null) : null
    setActiveCategoryId(start)
    setHighlighted(start ? CATEGORY_ROW + start : "")
  }

  const choose = (id: string) => {
    if (isMultiple) {
      onValueChange(isChosen(id) ? value.filter((chosen) => chosen !== id) : [...value, id])
      return
    }
    onValueChange(id)
    setIsOpen(false)
  }
  const chooseCategory = (category: CategoryGroup) => {
    if (!isMultiple) return
    const ids = category.options.map((option) => option.id)
    onValueChange(
      isWholeCategory(category)
        ? value.filter((id) => !ids.includes(id))
        : [...value, ...ids.filter((id) => !value.includes(id))],
    )
  }

  // The trigger: the one activity, a whole category, or the first and how many more.
  const [first] = selected
  const wholeCategory =
    isMultiple && selected.length > 1
      ? categories.find((c) => isWholeCategory(c) && c.options.length === selected.length)
      : undefined
  const summary = wholeCategory ? (
    <>
      {isCategoryKey(wholeCategory.icon) ? (
        <CategoryIcon
          category={wholeCategory.icon}
          className="size-5"
        />
      ) : null}
      <span className="truncate">{wholeCategory.label}</span>
    </>
  ) : first ? (
    <>
      {selected.length === 1 && isActivityKey(first.icon) ? (
        <ActivityIcon
          activity={first.icon}
          className="size-5"
        />
      ) : null}
      {/* Two or more as "the first + N": a list of names would be cut off on a phone. */}
      <span className="truncate">
        {selected.length === 1
          ? first.label
          : t("hobbyhub.activityCombobox.andMore", {
              first: first.label,
              more: selected.length - 1,
            })}
      </span>
    </>
  ) : (
    <span className="truncate">{placeholder}</span>
  )

  const trigger = (
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
      <span
        className={cn(
          "flex min-w-0 items-center gap-2",
          selected.length === 0 && "text-muted-foreground",
        )}
      >
        {summary}
      </span>
      <ChevronDownIcon
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </button>
  )

  const activityRow = (option: ActivityComboboxOption, hasCategoryCaption = false) => {
    const inCategory = option.category ? categoryLabel(option.category) : ""
    const caption = hasCategoryCaption ? inCategory : ""
    return (
      <CommandItem
        key={option.id}
        value={option.id}
        // The category is searched too: "míčové" lists every ball sport.
        keywords={inCategory ? [option.label, inCategory] : [option.label]}
        // cmdk uses `aria-selected` for the highlighted row; the chosen ones carry `aria-checked`.
        aria-checked={isChosen(option.id)}
        onSelect={() => choose(option.id)}
      >
        {/* A chosen activity's token fills purple: easy to spot, and apart from
            the highlighted row's light tint. */}
        {isActivityKey(option.icon) ? (
          <ActivityToken
            activity={option.icon}
            isSelected={isChosen(option.id)}
            className={cn("size-8", isChosen(option.id) && "bg-primary text-primary-foreground")}
          />
        ) : (
          <span
            aria-hidden
            className="size-8 shrink-0 rounded-full bg-muted"
          />
        )}
        <span className="flex min-w-0 flex-col">
          <span className={cn("truncate", isChosen(option.id) && "typo-label-lg")}>
            {option.label}
          </span>
          {caption ? <span className="typo-caption text-muted-foreground">{caption}</span> : null}
        </span>
        <CheckIcon
          aria-hidden
          className={cn(
            "ml-auto size-4 text-primary",
            isChosen(option.id) ? "opacity-100" : "opacity-0",
          )}
        />
      </CommandItem>
    )
  }

  const categoryRow = (category: CategoryGroup, isActive: boolean, onSelect: () => void) => {
    const count = chosenIn(category)
    return (
      <CommandItem
        key={category.id}
        value={CATEGORY_ROW + category.id}
        keywords={[category.label]}
        onSelect={onSelect}
        className={cn(isActive && "bg-accent text-accent-foreground")}
      >
        {isCategoryKey(category.icon) ? (
          <CategoryIcon
            category={category.icon}
            className="size-5"
          />
        ) : null}
        <span className="flex-1">{category.label}</span>
        {count > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 typo-caption text-primary-foreground">
            <span aria-hidden>{count}</span>
            <span className="sr-only">{t("hobbyhub.activityCombobox.chosenCount", { count })}</span>
          </span>
        ) : null}
        <ChevronRightIcon
          aria-hidden
          className="size-4"
        />
      </CommandItem>
    )
  }

  // The activities of one category: its name as a quiet caption, "all of them"
  // in a filter, then the activities.
  const categoryActivities = (category: CategoryGroup, header: ReactNode) => (
    <CommandGroup
      key={category.id}
      heading={header}
    >
      {isMultiple ? (
        <CommandItem
          value={ALL_ROW + category.id}
          aria-checked={isWholeCategory(category)}
          onSelect={() => chooseCategory(category)}
          className="text-accent-foreground"
        >
          <span
            aria-hidden
            className={cn(
              "flex size-4 items-center justify-center rounded-sm border border-input",
              isWholeCategory(category) && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {isWholeCategory(category) ? (
              <CheckIcon className="size-3.5 text-primary-foreground" />
            ) : null}
          </span>
          <span className="typo-label">
            {t("hobbyhub.activityCombobox.selectAll", { total: category.options.length })}
          </span>
        </CommandItem>
      ) : null}
      {category.options.map((option) => activityRow(option))}
    </CommandGroup>
  )

  const quietHeader = (category: CategoryGroup) => (
    <span className="flex items-center gap-1.5 typo-small text-muted-foreground">
      {isCategoryKey(category.icon) ? (
        <CategoryIcon
          category={category.icon}
          className="size-4"
        />
      ) : null}
      {category.label}
    </span>
  )

  const looseGroup =
    looseOptions.length > 0 ? (
      <CommandGroup>{looseOptions.map((option) => activityRow(option))}</CommandGroup>
    ) : null

  // Computer: categories on the left, the activities of the one pointed at on the right.
  const columns = (
    <div className="grid h-96 grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
      <CommandGroup
        aria-label={t("hobbyhub.activityCombobox.categories")}
        className="overflow-y-auto border-r border-border"
      >
        {categories.map((category) =>
          categoryRow(category, category.id === activeCategory?.id, () =>
            setActiveCategoryId(category.id),
          ),
        )}
      </CommandGroup>
      <div className="overflow-y-auto">
        {looseGroup}
        {activeCategory ? categoryActivities(activeCategory, quietHeader(activeCategory)) : null}
      </div>
    </div>
  )

  // Phone: the categories, then the activities of the one tapped with a way back.
  const steps = activeCategory ? (
    <>
      <CommandGroup>
        <CommandItem
          value={BACK_ROW}
          onSelect={() => setActiveCategoryId(null)}
          className="border-b border-border typo-title"
        >
          <ChevronLeftIcon
            aria-hidden
            className="size-5 text-foreground"
          />
          <span className="sr-only">{t("hobbyhub.activityCombobox.back")}</span>
          {isCategoryKey(activeCategory.icon) ? (
            <CategoryIcon
              category={activeCategory.icon}
              className="size-5"
            />
          ) : null}
          {activeCategory.label}
        </CommandItem>
      </CommandGroup>
      {categoryActivities(activeCategory, undefined)}
    </>
  ) : (
    <>
      {looseGroup}
      <CommandGroup>
        {categories.map((category) =>
          categoryRow(category, false, () => setActiveCategoryId(category.id)),
        )}
      </CommandGroup>
    </>
  )

  const results = (
    <>
      <CommandEmpty>{t("hobbyhub.activityCombobox.noMatch")}</CommandEmpty>
      <CommandGroup>
        {listedOptions.map((option) => activityRow(option, isByCategory))}
      </CommandGroup>
    </>
  )

  const list = (
    <Command
      filter={matches}
      value={highlighted}
      // Pointing at a category on a computer (mouse or arrows) shows its activities.
      onValueChange={(row) => {
        setHighlighted(row)
        if (isDesktop && isBrowsing && row.startsWith(CATEGORY_ROW)) {
          setActiveCategoryId(row.slice(CATEGORY_ROW.length))
        }
      }}
    >
      <CommandInput
        placeholder={t("hobbyhub.activityCombobox.search")}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList
        id={listId}
        className={cn(
          isBrowsing && isDesktop && "max-h-none overflow-hidden",
          !isDesktop && "max-h-none",
        )}
      >
        {!isBrowsing ? results : isDesktop ? columns : steps}
      </CommandList>
    </Command>
  )

  if (!isDesktop && isByCategory) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={open}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="h-[85svh]">
          <DrawerHeader>
            <DrawerTitle>{placeholder}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {t("hobbyhub.activityCombobox.description")}
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-3">{list}</div>
          <DrawerFooter>
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
            >
              {t("hobbyhub.activityCombobox.done")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    // Modal, so the list scrolls inside a dialog or drawer: their scroll lock
    // swallows wheel and touch events in a non-modal popover's portal.
    <Popover
      modal
      open={isOpen}
      onOpenChange={open}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-(--radix-popover-trigger-width) p-0", isByCategory && "min-w-md")}
      >
        {list}
      </PopoverContent>
    </Popover>
  )
}
