import "@testing-library/jest-dom/vitest"

import { i18n } from "@/i18n"

// jsdom reports an English browser; tests are written against the Czech UI.
await i18n.changeLanguage("cs")
