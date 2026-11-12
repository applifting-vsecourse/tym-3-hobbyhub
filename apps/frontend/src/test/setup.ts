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

// jsdom has no matchMedia; render the computer layout unless a test says otherwise
// (it can replace window.matchMedia, as the phone cases of ActivityCombobox do).
if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

// jsdom has no pointer capture or scrollIntoView; Radix Select calls both, the
// vaul drawer captures the pointer when it is pressed.
const elementStubs = {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
}
for (const [name, stub] of Object.entries(elementStubs)) {
  if (!(name in Element.prototype)) Object.defineProperty(Element.prototype, name, { value: stub })
}
