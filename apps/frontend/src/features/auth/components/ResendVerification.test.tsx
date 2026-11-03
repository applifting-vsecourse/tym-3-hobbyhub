import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { ResendVerification } from "@/features/auth/components/ResendVerification"
import { VerifyEmailSheet } from "@/features/auth/components/VerifyEmailSheet"

const { sendVerificationEmail, getSession } = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn(),
  getSession: vi.fn(),
}))
vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { sendVerificationEmail, getSession },
}))

const user = (isVerified: boolean) => ({
  id: "u1",
  name: "Jana Nováková",
  email: "jana@example.com",
  emailVerified: isVerified,
})

const renderWithSession = async (ui: ReactNode, isVerified = false) => {
  getSession.mockResolvedValue({ data: { user: user(isVerified) }, error: null })
  const queryClient = new QueryClient()
  await queryClient.ensureQueryData(authSessionQueryOptions())
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe("ResendVerification", () => {
  beforeEach(() => {
    sendVerificationEmail.mockReset()
    sendVerificationEmail.mockResolvedValue({ data: {}, error: null })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("sends the e-mail to the signed-in address and leads the link back to this page", async () => {
    await renderWithSession(<ResendVerification />)

    await userEvent.click(screen.getByRole("button", { name: "Poslat e-mail znovu" }))

    expect(sendVerificationEmail).toHaveBeenCalledOnce()
    const [sent] = sendVerificationEmail.mock.calls[0] as [{ email: string; callbackURL: string }]
    expect(sent.email).toBe("jana@example.com")
    expect(sent.callbackURL).toContain("/verify-email?next=")
    expect(await screen.findByText(/Nový e-mail je na cestě/)).toBeInTheDocument()
  })

  it("leads the new link on to the given page instead of back to this one", async () => {
    await renderWithSession(<ResendVerification next="/events/e1" />)

    await userEvent.click(screen.getByRole("button", { name: "Poslat e-mail znovu" }))

    const [sent] = sendVerificationEmail.mock.calls[0] as [{ callbackURL: string }]
    expect(sent.callbackURL).toBe(
      `${window.location.origin}/verify-email?next=${encodeURIComponent("/events/e1")}`,
    )
  })

  it("makes the person wait a minute before the next one", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await renderWithSession(<ResendVerification />)

    await userEvent.click(screen.getByRole("button", { name: "Poslat e-mail znovu" }))

    expect(await screen.findByRole("button", { name: "Poslat znovu za 60 s" })).toBeDisabled()

    for (let second = 0; second < 60; second++) {
      await act(() => vi.advanceTimersByTimeAsync(1000))
    }

    expect(screen.getByRole("button", { name: "Poslat e-mail znovu" })).toBeEnabled()
  })

  it("starts the wait too when the server says it is too soon", async () => {
    sendVerificationEmail.mockResolvedValue({
      data: null,
      error: { status: 429, message: "Too many requests" },
    })
    await renderWithSession(<ResendVerification />)

    await userEvent.click(screen.getByRole("button", { name: "Poslat e-mail znovu" }))

    expect(await screen.findByText(/Příliš mnoho pokusů/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Poslat znovu za/ })).toBeDisabled()
  })
})

describe("VerifyEmailSheet", () => {
  it("says what is missing and offers to send the e-mail again", async () => {
    await renderWithSession(
      <VerifyEmailSheet
        isOpen
        onOpenChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("dialog", { name: "Nejdřív ověř svůj e-mail" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Poslat e-mail znovu" })).toBeInTheDocument()
  })
})
