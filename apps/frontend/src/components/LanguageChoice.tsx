import { useTranslation } from "react-i18next"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { languageOf, LANGUAGES, type Language } from "@/i18n/resources"
import { cn } from "@/lib/utils"

type LanguageChoiceProps = {
  /**
   * What choosing a language does. Without it the app just switches, which is
   * all a visitor needs; a signed-in user's choice goes to the account first.
   */
  onSelect?: (language: Language) => void
  isDisabled?: boolean
  className?: string
}

/**
 * Jazyk (#215) — the footer's language switch, the same segmented toggle as
 * the appearance next to it. Each language is named in itself. The quiet
 * links (`LanguageLinks`) stay under the sign-in forms.
 */
export function LanguageChoice({ onSelect, isDisabled = false, className }: LanguageChoiceProps) {
  const { t, i18n } = useTranslation()
  const current = languageOf(i18n.resolvedLanguage)
  const select = onSelect ?? ((language: Language) => void i18n.changeLanguage(language))

  return (
    <ToggleGroup
      type="single"
      variant="segment"
      spacing={1}
      value={current}
      disabled={isDisabled}
      // A language is always chosen: clicking the current one keeps it.
      onValueChange={(next) => {
        const language = LANGUAGES.find(({ code }) => code === next)
        if (language && language.code !== current) select(language.code)
      }}
      aria-label={t("footer.language")}
      className={cn("h-11 rounded-full bg-muted p-1", className)}
    >
      {LANGUAGES.map(({ code, label }) => (
        <ToggleGroupItem
          key={code}
          value={code}
          lang={code}
          className="h-full px-3"
        >
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
