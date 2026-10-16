import "@testing-library/jest-dom/vitest"

import { i18n } from "@/i18n"

// jsdom reports an English browser; tests are written against the Czech UI.
await i18n.changeLanguage("cs")

// jsdom has no ResizeObserver; Radix measures checkboxes and radios with it.
globalThis.ResizeObserver ??= class {
  observe = () => undefined
  unobserve = () => undefined
  disconnect = () => undefined
}
