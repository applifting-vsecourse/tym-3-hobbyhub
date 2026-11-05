import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { ApprovedParticipants } from "@/features/participation-request/components/ApprovedParticipants"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

const aParticipant = (id: string, name: string) => ({
  userId: `user-${id}`,
  applicant: { name, image: null, bio: null, hasVerifiedEmail: true },
})

const answer = (items: unknown[]) =>
  get.mockReturnValueOnce({ json: () => Promise.resolve({ items, total: items.length }) })

const renderList = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApprovedParticipants eventId="e1" />
    </QueryClientProvider>,
  )

describe("ApprovedParticipants", () => {
  beforeEach(() => get.mockReset())

  it("asks for the approved ones and links each name to the profile", async () => {
    answer([aParticipant("r1", "Honza_K")])
    await renderList()

    const link = await screen.findByRole("link", { name: "Honza_K" })
    expect(link.getAttribute("href")).toBe("/profile/user-r1")
    expect(get).toHaveBeenCalledWith("events/e1/participants", {
      searchParams: { limit: "20", offset: "0" },
    })
  })

  it("says so when nobody is approved yet", async () => {
    answer([])
    await renderList()

    expect(
      await screen.findByText("Zatím tu nejsou žádní schválení účastníci."),
    ).toBeInTheDocument()
  })
})
