import { useId } from "react"
import { useTranslation } from "react-i18next"

import { languageOf, LANGUAGES, type Language } from "@/i18n/resources"
import { cn } from "@/lib/utils"

type LanguageLinksProps = {
  /**
   * What choosing a language does. Without it the app just switches, which is
   * all a visitor needs; a signed-in user's choice goes to the account first.
   */
  onSelect?: (language: Language) => void
  isDisabled?: boolean
  className?: string
}

/**
 * #262: "Jazyk: Čeština · English" — the way out for a visitor whose browser
 * got the language wrong, in the footer and under the sign-in forms. Quiet on
 * purpose: most people never need it. Each language is named in itself.
 */
export function LanguageLinks({ onSelect, isDisabled = false, className }: LanguageLinksProps) {
  const { t, i18n } = useTranslation()
  const current = languageOf(i18n.resolvedLanguage)
  const labelId = useId()
  const select = onSelect ?? ((language: Language) => void i18n.changeLanguage(language))

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={cn(
        "flex flex-wrap items-center gap-x-1 typo-small text-muted-foreground",
        className,
      )}
    >
      <span id={labelId}>{t("footer.language")}:</span>
      {LANGUAGES.map(({ code, label }, index) => (
        <span
          key={code}
          className="flex items-center gap-x-1"
        >
          {index > 0 ? <span aria-hidden>·</span> : null}
          <button
            type="button"
            lang={code}
            aria-pressed={code === current}
            disabled={isDisabled}
            onClick={() => {
              if (code !== current) select(code)
            }}
            className="inline-flex min-h-11 items-center rounded-sm px-1 underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50 aria-pressed:text-foreground aria-pressed:hover:no-underline md:min-h-0"
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  )
}
