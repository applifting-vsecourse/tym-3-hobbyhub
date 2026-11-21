import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"
import type { Language } from "@/i18n/resources"

import { useAccountLanguage } from "@/features/auth/hooks/useAccountLanguage"
import { useSession } from "@/features/auth/hooks/useSession"

vi.mock("@/features/auth/hooks/useSession", () => ({ useSession: vi.fn() }))

const signedIn = (language: Language | null) =>
  vi.mocked(useSession).mockReturnValue({
    user: { id: "u1", name: "jana", email: "jana@example.com", emailVerified: true, language },
    isPending: false,
    error: null,
  })

describe("useAccountLanguage", () => {
  afterEach(async () => {
    await i18n.changeLanguage("cs")
  })

  // #262, scenario 7: the account wins over what this browser had.
  it("switches to the account's language after sign-in", async () => {
    await i18n.changeLanguage("cs")
    signedIn("en")
    renderHook(() => useAccountLanguage())

    await waitFor(() => expect(i18n.resolvedLanguage).toBe("en"))
  })

  it("leaves a visitor's language alone", async () => {
    await i18n.changeLanguage("en")
    vi.mocked(useSession).mockReturnValue({ user: null, isPending: false, error: null })
    renderHook(() => useAccountLanguage())

    expect(i18n.resolvedLanguage).toBe("en")
  })

  it("leaves the language alone while the account has none it knows", async () => {
    await i18n.changeLanguage("en")
    signedIn(null)
    renderHook(() => useAccountLanguage())

    expect(i18n.resolvedLanguage).toBe("en")
  })
})
