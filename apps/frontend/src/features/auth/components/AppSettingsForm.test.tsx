import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"
import { renderWithRouter } from "@/test/renderWithRouter"

import { AppSettingsForm } from "@/features/auth/components/AppSettingsForm"
import { useSession } from "@/features/auth/hooks/useSession"

const requests = vi.hoisted(() => ({ updateLanguage: vi.fn() }))
vi.mock("@/features/auth/api/languageRequests", () => requests)

vi.mock("@/features/auth/hooks/useSession", () => ({ useSession: vi.fn() }))

const theme = vi.hoisted(() => ({ theme: "system", setTheme: vi.fn() }))
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => theme }))

const renderForm = () =>
  renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <AppSettingsForm />
    </QueryClientProvider>,
  )

describe("AppSettingsForm", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("cs")
    requests.updateLanguage.mockReset().mockResolvedValue(undefined)
    theme.setTheme.mockReset()
    vi.mocked(useSession).mockReturnValue({
      user: {
        id: "u1",
        name: "jana",
        email: "jana@example.com",
        emailVerified: true,
        language: "cs",
      },
      isPending: false,
      error: null,
    })
  })

  afterEach(async () => {
    await i18n.changeLanguage("cs")
  })

  it("starts from the account's language and this device's theme", async () => {
    await renderForm()

    expect(screen.getByRole("radio", { name: "Čeština" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Podle systému" })).toBeChecked()
  })

  // #262, scenario 2: nothing changes until "Uložit".
  it("saves the language to the account and switches the app only after Uložit", async () => {
    const user = userEvent.setup()
    await renderForm()

    await user.click(screen.getByRole("radio", { name: "English" }))
    await user.click(screen.getByRole("radio", { name: "Tmavý" }))
    expect(i18n.resolvedLanguage).toBe("cs")
    expect(theme.setTheme).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(i18n.resolvedLanguage).toBe("en"))
    expect(requests.updateLanguage).toHaveBeenCalledWith("en")
    expect(theme.setTheme).toHaveBeenCalledWith("dark")
    expect(await screen.findByRole("status")).toHaveTextContent("Your settings are saved.")
  })

  it("keeps the theme on this device without asking the server", async () => {
    const user = userEvent.setup()
    await renderForm()

    await user.click(screen.getByRole("radio", { name: "Světlý" }))
    await user.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(theme.setTheme).toHaveBeenCalledWith("light"))
    expect(requests.updateLanguage).not.toHaveBeenCalled()
  })

  // #262, scenario 4.
  it("changes nothing and keeps the choice when the language cannot be saved", async () => {
    const user = userEvent.setup()
    requests.updateLanguage.mockRejectedValue(new Error("offline"))
    await renderForm()

    await user.click(screen.getByRole("radio", { name: "English" }))
    await user.click(screen.getByRole("radio", { name: "Tmavý" }))
    await user.click(screen.getByRole("button", { name: "Uložit" }))

    expect(
      await screen.findByText("Nastavení se nepodařilo uložit. Zkuste to prosím znovu."),
    ).toBeInTheDocument()
    expect(i18n.resolvedLanguage).toBe("cs")
    expect(theme.setTheme).not.toHaveBeenCalled()
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked()
  })

  // #262, scenario 3.
  it("asks before leaving with a change that was not saved", async () => {
    const user = userEvent.setup()
    const { navigateAway } = await renderForm()

    await user.click(screen.getByRole("radio", { name: "English" }))
    navigateAway()

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })
})
