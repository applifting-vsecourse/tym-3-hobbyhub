import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { useSignIn } from "@/features/auth/hooks/useSignIn"

const { signInEmail, getSession } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  getSession: vi.fn(),
}))
vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { signIn: { email: signInEmail }, getSession },
}))

const user = { id: "u1", name: "Jana Nováková", email: "jana@example.com" }

describe("useSignIn", () => {
  it("refreshes the session that only the page loaders read", async () => {
    const queryClient = new QueryClient()
    // The sign-in page's loader reads the session; no component on it does.
    getSession.mockResolvedValueOnce({ data: null, error: null })
    await queryClient.ensureQueryData(authSessionQueryOptions())

    signInEmail.mockResolvedValue({ data: {}, error: null })
    getSession.mockResolvedValue({ data: { user }, error: null })
    const { result } = renderHook(() => useSignIn(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    })
    await result.current.mutateAsync({ email: user.email, password: "heslo123" })

    // What the protected pages' loader gets on the way to the next page.
    await expect(queryClient.ensureQueryData(authSessionQueryOptions())).resolves.toMatchObject({
      user: { id: user.id },
    })
  })
})
