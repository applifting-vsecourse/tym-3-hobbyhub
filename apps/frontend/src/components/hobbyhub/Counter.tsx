import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CounterProps = {
  label: string
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  /** Id of the number field, e.g. from `FormControl`. */
  id?: string
  className?: string
}

/**
 * Počítadlo — a number of people. Plus and minus for small changes, the
 * number itself is typed for big ones (a hundred people are not clicked).
 * Whole numbers inside the bounds apply as they are typed; leaving the field
 * clamps the rest to the bounds or restores the last value.
 */
export function Counter({
  label,
  value,
  onValueChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  id,
  className,
}: CounterProps) {
  const { t } = useTranslation()
  const generatedId = useId()
  const inputId = id ?? generatedId
  const labelId = `${inputId}-label`
  // What is in the field while it is being edited; null shows `value`.
  const [draft, setDraft] = useState<string | null>(null)

  const clamp = (candidate: number) => Math.min(Math.max(candidate, min), max)

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isInteger(parsed)) onValueChange(clamp(parsed))
    setDraft(null)
  }

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={cn("flex w-full flex-col gap-1.5", className)}
    >
      <label
        id={labelId}
        htmlFor={inputId}
        className="typo-label-lg text-foreground"
      >
        {label}
      </label>
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label={t("hobbyhub.counter.less", { label })}
          disabled={value <= min}
          onClick={() => onValueChange(value - 1)}
          className="rounded-full"
        >
          <span
            aria-hidden
            className="typo-h3"
          >
            −
          </span>
        </Button>
        <input
          id={inputId}
          // Text with a numeric keyboard: a number input would draw its own
          // spinner next to the plus and minus.
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={draft ?? String(value)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "")
            setDraft(digits)
            const parsed = Number.parseInt(digits, 10)
            // "100" passes through 1 and 10: whatever is in range applies at once.
            if (Number.isInteger(parsed) && parsed >= min && parsed <= max) {
              onValueChange(parsed)
            }
          }}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(event.currentTarget.value)
          }}
          className="w-20 min-w-0 rounded-sm bg-transparent text-center typo-numeral text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label={t("hobbyhub.counter.more", { label })}
          disabled={value >= max}
          onClick={() => onValueChange(value + 1)}
          className="rounded-full"
        >
          <span
            aria-hidden
            className="typo-h3"
          >
            +
          </span>
        </Button>
      </div>
    </div>
  )
}
