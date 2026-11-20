import type { CSSProperties } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const

/**
 * "Jak to funguje" (#216): four short steps in one row, a line each. The
 * landing page sells through the events and the two claims above it; this is
 * the quick read for whoever wants the mechanism, so it takes little room:
 * no pictures, no rail, no second paragraph.
 */
export function HowItWorks({ className, style }: { className?: string; style?: CSSProperties }) {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby="how-heading"
      className={cn("flex flex-col gap-8", className)}
      style={style}
    >
      <h2
        id="how-heading"
        className="typo-h3"
      >
        {t("landing.how.title")}
      </h2>
      <ol className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEP_KEYS.map((key, index) => (
          <li
            key={key}
            className="group flex reveal gap-4 border-t border-border pt-4 transition-colors duration-200 hover:border-primary"
            style={{ "--reveal-index": index } as CSSProperties}
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-input typo-label font-heading transition-colors duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-2">
              <h3 className="typo-label-lg">{t(`landing.how.${key}.title`)}</h3>
              <p className="typo-body text-muted-foreground">{t(`landing.how.${key}.text`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
