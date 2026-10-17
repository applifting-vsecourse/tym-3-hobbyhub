import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import { DEFAULT_LANGUAGE, LANGUAGES, resources } from "@/i18n/resources"

const setDocumentLanguage = (language: string) => {
  document.documentElement.lang = language
}

// Order: a language the user picked (localStorage) wins over the browser's.
// A profile setting would slot in before both once the backend stores one.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS: "common",
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: LANGUAGES.map(({ code }) => code),
    // "cs-CZ" and "en-GB" resolve to "cs" and "en".
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
  })

setDocumentLanguage(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE)
i18n.on("languageChanged", setDocumentLanguage)

export { i18n }
