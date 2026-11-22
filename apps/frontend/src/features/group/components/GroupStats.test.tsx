import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { GroupStats } from "@/features/group/components/GroupStats"

const get = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ api: { get } }))

describe("GroupStats", () => {
  it("writes the numbers the Czech way, with a decimal comma", async () => {
    get.mockReturnValue({
      json: () => Promise.resolve({ playedEvents: 12, averageParticipants: 7.5 }),
    })

    render(
      <QueryClientProvider client={new QueryClient()}>
        <GroupStats group={{ id: "g1", memberCount: 1200, meetingDays: [] } as never} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText("7,5")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    // Members go through Intl too: a thousand is not run together.
    expect(screen.getByText(/^1\s?200$/)).toBeInTheDocument()
  })
})
