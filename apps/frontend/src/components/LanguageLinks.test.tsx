import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { LanguageLinks } from "@/components/LanguageLinks"
import { i18n } from "@/i18n"

describe("LanguageLinks", () => {
  afterEach(async () => {
    await i18n.changeLanguage("cs")
  })

  it("marks the language shown and names each language in itself", () => {
    render(<LanguageLinks />)

    expect(screen.getByRole("group", { name: "Jazyk:" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Čeština" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("lang", "en")
  })

  // #262: a visitor's choice only switches the app (and stays in the browser).
  it("switches the app for a visitor", async () => {
    const user = userEvent.setup()
    render(<LanguageLinks />)

    await user.click(screen.getByRole("button", { name: "English" }))

    expect(i18n.resolvedLanguage).toBe("en")
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true")
  })

  it("leaves the choice to the caller when given one, and ignores the current language", async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<LanguageLinks onSelect={onSelect} />)

    await user.click(screen.getByRole("button", { name: "Čeština" }))
    await user.click(screen.getByRole("button", { name: "English" }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith("en")
    expect(i18n.resolvedLanguage).toBe("cs")
  })
})
