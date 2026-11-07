import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { useSignUp, type SignUpInput } from "@/features/auth/hooks/useSignUp"

const { signUpEmail, getSession } = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  getSession: vi.fn(),
}))
vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signUp: { email: signUpEmail }, getSession },
}))

const user = { id: "u1", name: "Jana Nováková", email: "jana@example.com" }

const input: SignUpInput = {
  name: user.name,
  email: user.email,
  password: "heslo123",
  gender: "FEMALE",
  birthYear: 1995,
  adulthoodConfirmed: true,
  termsAccepted: true,
}

const signUp = async (queryClient: QueryClient, from?: string) => {
  const { result } = renderHook(() => useSignUp(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  await result.current.mutateAsync({ ...input, from })
}

describe("useSignUp", () => {
  beforeEach(() => {
    signUpEmail.mockResolvedValue({ data: {}, error: null })
  })

  it("sends the verification link to the confirmation page of the app", async () => {
    getSession.mockResolvedValue({ data: null, error: null })
    await signUp(new QueryClient())

    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: `${window.location.origin}/verify-email` }),
    )
  })

  it("lets the confirmation lead back to the page the visitor came from", async () => {
    getSession.mockResolvedValue({ data: null, error: null })
    await signUp(new QueryClient(), encodeURIComponent("/events/e1"))

    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackURL: `${window.location.origin}/verify-email?next=${encodeURIComponent("/events/e1")}`,
      }),
    )
    // `from` is the page's business, not the sign-up API's.
    expect(signUpEmail.mock.calls[0]?.[0]).not.toHaveProperty("from")
  })

  it("does not lead anywhere outside the app", async () => {
    getSession.mockResolvedValue({ data: null, error: null })
    await signUp(new QueryClient(), encodeURIComponent("//evil.example"))

    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackURL: `${window.location.origin}/verify-email?next=${encodeURIComponent("/")}`,
      }),
    )
  })

  it("refreshes the session that only the page loaders read", async () => {
    const queryClient = new QueryClient()
    // The sign-up page's loader reads the session; no component on it does.
    getSession.mockResolvedValueOnce({ data: null, error: null })
    await queryClient.ensureQueryData(authSessionQueryOptions())

    getSession.mockResolvedValue({ data: { user }, error: null })
    await signUp(queryClient)

    // What the protected pages' loader gets on the way to the next page.
    await expect(queryClient.ensureQueryData(authSessionQueryOptions())).resolves.toMatchObject({
      user: { id: user.id },
    })
  })
})
