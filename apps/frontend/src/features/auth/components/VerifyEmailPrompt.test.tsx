import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { VerifyEmailPrompt } from "@/features/auth/components/VerifyEmailPrompt"
import { clearResendCooldowns } from "@/features/auth/lib/resendCooldown"

const { sendVerificationEmail, getSession } = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn(),
  getSession: vi.fn(),
}))
vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { sendVerificationEmail, getSession },
}))

const renderPrompt = async (session: { emailVerified: boolean } | null) => {
  getSession.mockResolvedValue({
    data: session
      ? {
          user: {
            id: "u1",
            name: "Jana Nováková",
            email: "jana@example.com",
            emailVerified: session.emailVerified,
          },
        }
      : null,
    error: null,
  })
  const queryClient = new QueryClient()
  await queryClient.ensureQueryData(authSessionQueryOptions())
  return render(
    <QueryClientProvider client={queryClient}>
      <VerifyEmailPrompt />
    </QueryClientProvider>,
  )
}

describe("VerifyEmailPrompt", () => {
  beforeEach(() => {
    clearResendCooldowns()
    sendVerificationEmail.mockReset()
    sendVerificationEmail.mockResolvedValue({ data: {}, error: null })
  })

  it("asks an unverified person to finish, names the address and sends the link again", async () => {
    await renderPrompt({ emailVerified: false })

    expect(screen.getByRole("alert")).toHaveTextContent("Dokonči ověření e-mailu")
    expect(screen.getByText(/Poslali jsme ti odkaz na jana@example.com/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Poslat e-mail znovu" }))

    expect(sendVerificationEmail).toHaveBeenCalledOnce()
    expect(await screen.findByText(/Nový e-mail je na cestě/)).toBeInTheDocument()
  })

  it("says nothing once the e-mail is verified", async () => {
    const { container } = await renderPrompt({ emailVerified: true })

    expect(container).toBeEmptyDOMElement()
  })

  it("says nothing without a session", async () => {
    const { container } = await renderPrompt(null)

    expect(container).toBeEmptyDOMElement()
  })
})
