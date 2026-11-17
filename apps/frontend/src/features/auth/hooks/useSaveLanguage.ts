import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import type { Language } from "@/i18n/resources"
import { authKeys } from "@/lib/auth-keys"

import type { Session } from "@/features/auth/api/authSessionQueryOptions"
import { updateLanguage } from "@/features/auth/api/languageRequests"

/**
 * #262: a signed-in user's language goes to the account first and the app
 * switches only once it is saved, so a failed save leaves everything as it was.
 */
export function useSaveLanguage() {
  const queryClient = useQueryClient()
  const { i18n } = useTranslation()

  return useMutation({
    mutationFn: (language: Language) => updateLanguage(language),
    onSuccess: async (_data, language) => {
      // The session says the new language at once, so the account-language
      // sync does not switch back before the session is fetched again.
      queryClient.setQueryData<Session>(authKeys.session(), (session) =>
        session ? { ...session, user: { ...session.user, language } } : session,
      )
      await i18n.changeLanguage(language)
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}
