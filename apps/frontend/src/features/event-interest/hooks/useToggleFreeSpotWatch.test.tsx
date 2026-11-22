import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider, type InfiniteData } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { myEventsKeys } from "@/lib/my-events-keys"

import { WatchRefusedError } from "@/features/event-interest/api/eventInterest"
import { eventInterestKeys } from "@/features/event-interest/api/eventInterestKeys"
import type { EventInterestState } from "@/features/event-interest/api/eventInterestSchemas"
import { useToggleFreeSpotWatch } from "@/features/event-interest/hooks/useToggleFreeSpotWatch"

const { watchFreeSpot, unwatchFreeSpot, toast } = vi.hoisted(() => ({
  watchFreeSpot: vi.fn(),
  unwatchFreeSpot: vi.fn(),
  toast: { error: vi.fn() },
}))
vi.mock("@/features/event-interest/api/eventInterest", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  watchFreeSpot,
  unwatchFreeSpot,
}))
vi.mock("sonner", () => ({ toast }))

const stateKey = eventInterestKeys.state("e1", "u1")
const listKey = myEventsKeys.interested("u1", {})

type Page = { items: { id: string; watchesFreeSpot: boolean }[]; total: number }

const notSaved: EventInterestState = {
  isSaved: false,
  violations: [],
  isWatching: false,
  watchViolations: [],
}

const setup = (state: EventInterestState = notSaved, onFailure = vi.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(stateKey, state)
  queryClient.setQueryData<InfiniteData<Page>>(listKey, {
    pages: [
      {
        items: [
          { id: "e1", watchesFreeSpot: state.isWatching },
          { id: "e2", watchesFreeSpot: false },
        ],
        total: 2,
      },
    ],
    pageParams: [0],
  })
  const { result } = renderHook(() => useToggleFreeSpotWatch("u1", { onFailure }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  const watchedInList = (id: string) =>
    queryClient
      .getQueryData<InfiniteData<Page>>(listKey)
      ?.pages[0]?.items.find((item) => item.id === id)?.watchesFreeSpot
  return { queryClient, result, onFailure, watchedInList }
}

describe("useToggleFreeSpotWatch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("flips the detail and the row before the server answers, and saves the event", async () => {
    let answer: () => void = () => undefined
    watchFreeSpot.mockReturnValue(
      new Promise<void>((resolve) => {
        answer = resolve
      }),
    )
    const { queryClient, result, watchedInList } = setup()

    act(() => result.current.mutate({ eventId: "e1", shouldWatch: true }))

    await waitFor(() =>
      expect(queryClient.getQueryData<EventInterestState>(stateKey)).toMatchObject({
        isWatching: true,
        isSaved: true,
      }),
    )
    expect(watchedInList("e1")).toBe(true)
    expect(watchedInList("e2")).toBe(false)
    expect(watchFreeSpot).toHaveBeenCalledWith("e1")
    answer()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("stops watching and keeps the event saved", async () => {
    unwatchFreeSpot.mockResolvedValue(undefined)
    const { queryClient, result } = setup({ ...notSaved, isSaved: true, isWatching: true })

    act(() => result.current.mutate({ eventId: "e1", shouldWatch: false }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(unwatchFreeSpot).toHaveBeenCalledWith("e1")
    expect(queryClient.getQueryData<EventInterestState>(stateKey)).toMatchObject({
      isWatching: false,
      isSaved: true,
    })
  })

  it("flips back, says so and lets the page refresh the event when it fails", async () => {
    watchFreeSpot.mockRejectedValue(new Error("offline"))
    const { queryClient, result, onFailure, watchedInList } = setup()

    act(() => result.current.mutate({ eventId: "e1", shouldWatch: true }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData<EventInterestState>(stateKey)).toEqual(notSaved)
    expect(watchedInList("e1")).toBe(false)
    expect(toast.error).toHaveBeenCalledWith(
      "Hlídání se nepodařilo zapnout. Zkuste to prosím znovu.",
    )
    expect(onFailure).toHaveBeenCalledWith("e1")
  })

  it("says a seat freed up meanwhile when the server says the event is not full", async () => {
    watchFreeSpot.mockRejectedValue(new WatchRefusedError(["EVENT_NOT_FULL"]))
    const { result } = setup()

    act(() => result.current.mutate({ eventId: "e1", shouldWatch: true }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith(
      "Na akci se mezitím uvolnilo místo. Můžete se rovnou přihlásit.",
    )
  })
})
