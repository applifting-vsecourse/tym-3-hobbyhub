import { queryOptions } from "@tanstack/react-query"

import { fromAccountLanguage, type Language } from "@/i18n/resources"
import { authKeys } from "@/lib/auth-keys"

import { authClient } from "@/features/auth/lib/auth-client"

export type SessionUser = {
  id: string
  email: string
  name: string
  // The organizer sees it next to a request to join (F-06.1).
  emailVerified: boolean
  // #262: the language the app speaks to this user on every device.
  language: Language | null
}

export type Session = {
  user: SessionUser
} | null

export const authSessionQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<Session> => {
      const { data, error } = await authClient.getSession()
      if (error) throw new Error(error.message ?? "Failed to load session")
      if (!data?.user) return null

      const user = data.user

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          language: fromAccountLanguage(user.preferredLanguage),
        },
      }
    },
    staleTime: 30_000,
  })
