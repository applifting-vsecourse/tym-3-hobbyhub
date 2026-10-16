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

describe("translations", () => {
  it("have the same keys in every language", () => {
    const cs = keysOf(resources.cs.common).sort()
    expect(keysOf(resources.en.common).sort()).toEqual(cs)
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
