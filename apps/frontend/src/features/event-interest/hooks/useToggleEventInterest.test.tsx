import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { eventInterestKeys } from "@/features/event-interest/api/eventInterestKeys"
import type { EventInterestState } from "@/features/event-interest/api/eventInterestSchemas"
import { useToggleEventInterest } from "@/features/event-interest/hooks/useToggleEventInterest"

const { saveEventInterest, removeEventInterest, toast } = vi.hoisted(() => ({
  saveEventInterest: vi.fn(),
  removeEventInterest: vi.fn(),
  toast: { error: vi.fn() },
}))
vi.mock("@/features/event-interest/api/eventInterest", () => ({
  saveEventInterest,
  removeEventInterest,
}))
vi.mock("sonner", () => ({ toast }))

const key = eventInterestKeys.state("e1", "u1")

const setup = (state: EventInterestState) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(key, state)
  const { result } = renderHook(() => useToggleEventInterest("e1", "u1"), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return { queryClient, result }
}

describe("useToggleEventInterest", () => {
  it("flips the button before the server answers", async () => {
    let answer: (value: EventInterestState) => void = () => undefined
    saveEventInterest.mockReturnValue(
      new Promise<EventInterestState>((resolve) => {
        answer = resolve
      }),
    )
    const { queryClient, result } = setup({ isSaved: false, violations: [] })

    act(() => result.current.mutate(true))

    await waitFor(() =>
      expect(queryClient.getQueryData<EventInterestState>(key)?.isSaved).toBe(true),
    )
    expect(saveEventInterest).toHaveBeenCalledWith("e1")
    answer({ isSaved: true, violations: [] })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("flips it back and says so when saving fails", async () => {
    saveEventInterest.mockRejectedValue(new Error("offline"))
    const { queryClient, result } = setup({ isSaved: false, violations: [] })

    act(() => result.current.mutate(true))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData<EventInterestState>(key)?.isSaved).toBe(false)
    expect(toast.error).toHaveBeenCalledWith("Akci se nepodařilo uložit. Zkuste to prosím znovu.")
  })

  it("removes when tapped in the saved state", async () => {
    removeEventInterest.mockResolvedValue(undefined)
    const { queryClient, result } = setup({ isSaved: true, violations: [] })

    act(() => result.current.mutate(false))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(removeEventInterest).toHaveBeenCalledWith("e1")
    expect(queryClient.getQueryData<EventInterestState>(key)?.isSaved).toBe(false)
  })
})
