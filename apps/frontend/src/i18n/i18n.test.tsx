import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import { LanguageSwitcher } from "@/components/Header/LanguageSwitcher"
import { i18n } from "@/i18n"
import { resources } from "@/i18n/resources"

const keysOf = (value: object, prefix = ""): string[] =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null
      ? keysOf(child as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )

// Languages have different plural forms (cs: one/few/other, en: one/other),
// so "tooLong_few" only has to exist where the language needs it.
const withoutPluralSuffix = (keys: string[]) => [
  ...new Set(keys.map((key) => key.replace(/_(zero|one|two|few|many|other)$/, ""))),
]

describe("translations", () => {
  it("have the same keys in every language", () => {
    const cs = withoutPluralSuffix(keysOf(resources.cs.common)).sort()
    expect(withoutPluralSuffix(keysOf(resources.en.common)).sort()).toEqual(cs)
  })
})

describe("plurals", () => {
  const cases = [
    ["cs", 1, "Maximálně 1 znak"],
    ["cs", 3, "Maximálně 3 znaky"],
    ["cs", 280, "Maximálně 280 znaků"],
    ["en", 1, "Keep it under 1 character"],
    ["en", 280, "Keep it under 280 characters"],
  ] as const

  it.each(cases)("%s, count %i", async (language, count, expected) => {
    await i18n.changeLanguage(language)
    expect(i18n.t("quacks.form.tooLong", { count })).toBe(expected)
    await i18n.changeLanguage("cs")
  })

  it("keeps 'missing' invariant in Czech and English", async () => {
    expect(i18n.t("hobbyhub.capacity.missing", { count: 5 })).toBe("chybí 5")
    await i18n.changeLanguage("en")
    expect(i18n.t("hobbyhub.capacity.missing", { count: 5 })).toBe("5 missing")
    await i18n.changeLanguage("cs")
  })
})

describe("LanguageSwitcher", () => {
  afterEach(async () => {
    await i18n.changeLanguage("cs")
  })

  it("switches the language and the <html lang> attribute", async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole("button", { name: "Jazyk" }))
    await user.click(await screen.findByRole("menuitemradio", { name: "English" }))

    expect(i18n.resolvedLanguage).toBe("en")
    expect(document.documentElement.lang).toBe("en")
    expect(screen.getByRole("button", { name: "Language" })).toBeInTheDocument()
  })
})
