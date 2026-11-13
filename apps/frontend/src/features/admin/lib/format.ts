import { useTranslation } from "react-i18next"

/** Dates in the administration, in the current language. */
export function useAdminFormat() {
  const { i18n } = useTranslation()
  const locale = i18n.language
  return {
    date: (date: Date) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date),
    dateTime: (date: Date) =>
      new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date),
  }
}
