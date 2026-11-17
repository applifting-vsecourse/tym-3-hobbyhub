import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { useSession } from "@/features/auth/hooks/useSession"

/**
 * #262: once someone is signed in, the app speaks the account's language,
 * whatever this browser had before (an account from before #262 says Czech).
 * After signing out the app stays in the language it was last in.
 */
export function useAccountLanguage() {
  const { user } = useSession()
  const { i18n } = useTranslation()
  const language = user?.language ?? null

  useEffect(() => {
    if (language && i18n.resolvedLanguage !== language) void i18n.changeLanguage(language)
  }, [i18n, language])
}
