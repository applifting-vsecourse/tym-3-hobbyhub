import { useId } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CounterProps = {
  label: string
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  className?: string
}

/** Počítadlo — plus and minus for a number of people. */
export function Counter({
  label,
  value,
  onValueChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  className,
}: CounterProps) {
  const { t } = useTranslation()
  const labelId = useId()

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={cn("flex w-full flex-col gap-1.5", className)}
    >
      <p
        id={labelId}
        className="typo-label-lg text-foreground"
      >
        {label}
      </p>
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
        <output
          aria-live="polite"
          className="typo-numeral text-foreground"
        >
          {value}
        </output>
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
