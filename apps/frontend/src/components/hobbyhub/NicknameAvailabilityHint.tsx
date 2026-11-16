import { useTranslation } from "react-i18next"

import type { NicknameAvailability } from "@/hooks/useNicknameAvailability"
import { cn } from "@/lib/utils"

const MESSAGES = {
  checking: "nickname.checking",
  available: "nickname.available",
  taken: "nickname.taken",
} as const

const TONES = {
  checking: "text-muted-foreground",
  available: "text-success-ink",
  taken: "text-destructive",
} as const

/**
 * #212: under the nickname field, whether it is free. Always rendered, so a
 * screen reader hears each new answer from the live region.
 */
export function NicknameAvailabilityHint({
  availability,
}: {
  readonly availability: NicknameAvailability
}) {
  const { t } = useTranslation()
  const shown = availability === "idle" || availability === "unknown" ? null : availability

  return (
    <p
      aria-live="polite"
      className={cn("typo-small empty:hidden", shown && TONES[shown])}
    >
      {shown ? t(MESSAGES[shown]) : null}
    </p>
  )
}
