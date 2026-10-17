import { useState, type ComponentProps } from "react"
import { CalendarIcon } from "lucide-react"
import { cs } from "react-day-picker/locale/cs"
import { enUS } from "react-day-picker/locale/en-US"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { fromIsoDate, moveToMonth, toIsoDate } from "@/features/auth/lib/birthDate"

const CALENDAR_LOCALES = { cs, en: enUS }

// The calendar opens around a typical adult birth year instead of today,
// so nobody has to page back through decades month by month.
const OPENING_AGE = 25

type BirthDatePickerProps = Omit<ComponentProps<typeof Button>, "value" | "onChange"> & {
  /** "YYYY-MM-DD", or "" when nothing is picked yet. */
  value: string
  onChange: (value: string) => void
}

/**
 * Datum narození — a button showing the picked date that opens a calendar
 * with month and year dropdowns. Extra props (id, aria-*) go to the button,
 * so it works inside `FormControl`.
 */
export function BirthDatePicker({ value, onChange, className, ...props }: BirthDatePickerProps) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const language = i18n.resolvedLanguage === "en" ? "en" : "cs"
  const selected = fromIsoDate(value)
  const today = new Date()
  const openingMonth = selected ?? new Date(today.getFullYear() - OPENING_AGE, 0)
  // The month the calendar shows; the month and year dropdowns change it.
  const [month, setMonth] = useState(openingMonth)

  const handleOpenChange = (isOpening: boolean) => {
    if (isOpening) {
      setMonth(openingMonth)
    } else if (
      selected &&
      (month.getFullYear() !== selected.getFullYear() || month.getMonth() !== selected.getMonth())
    ) {
      // Closed after changing only the month or year: keep the day, move the date.
      onChange(toIsoDate(moveToMonth(selected, month, today)))
    }
    setIsOpen(isOpening)
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-12 w-full justify-start bg-card px-3.5 typo-body font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
          {...props}
        >
          <CalendarIcon
            aria-hidden
            className="size-4"
          />
          {selected
            ? new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(selected)
            : t("auth.placeholders.birthDate")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0"
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          locale={CALENDAR_LOCALES[language]}
          formatters={{
            formatMonthDropdown: (date) => date.toLocaleString(language, { month: "short" }),
          }}
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          startMonth={new Date(1900, 0)}
          endMonth={today}
          disabled={{ after: today }}
          onSelect={(date) => {
            if (!date) return
            onChange(toIsoDate(date))
            setIsOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
