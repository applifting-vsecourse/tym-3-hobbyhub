import { toAccountLanguage, type Language } from "@/i18n/resources"
import { api } from "@/lib/api-client"

// #262: the signed-in user's language, kept with the account.
export const updateLanguage = async (language: Language) => {
  await api.put("profile/language", { json: { language: toAccountLanguage(language) } })
}
