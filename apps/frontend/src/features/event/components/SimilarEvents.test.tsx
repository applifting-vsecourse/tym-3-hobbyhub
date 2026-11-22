import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api-client"

import { SimilarEvents } from "@/features/event/components/SimilarEvents"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    params,
    children,
    ...props
  }: {
    params: { eventId: string }
    children: React.ReactNode
    className?: string
  }) => (
    <a
      href={`/events/${params.eventId}`}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock("@/lib/api-client", () => ({ api: { get: vi.fn() } }))

const item = (id: string, title: string) => ({
  id,
  title,
  imageUrl: null,
  startAt: "2030-01-10T18:00:00.000Z",
  endAt: "2030-01-10T20:00:00.000Z",
  venueType: "PLACE",
  isAddressPublic: false,
  placeName: "Hala",
  district: null,
  city: "Praha",
  level: null,
  latitude: null,
  longitude: null,
  distanceKm: null,
  activity: { id: "a1", name: "Florbal", icon: "floorball" },
  minParticipants: 4,
  maxParticipants: 8,
  takenCount: 2,
  organizerName: "Jana",
  group: null,
  contributionAmount: null,
  hiddenReason: null,
})

const respondWith = (items: unknown[]) =>
  vi.mocked(api.get).mockReturnValue({ json: () => Promise.resolve({ items }) } as never)

const renderIt = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SimilarEvents
        eventId="e1"
        viewerId={null}
        activityLabel={(activity) => activity.name}
      />
    </QueryClientProvider>,
  )

describe("SimilarEvents", () => {
  it("shows the similar events under a heading, each linking to its detail", async () => {
    respondWith([item("e2", "Středeční florbal"), item("e3", "Páteční florbal")])
    renderIt()

    expect(await screen.findByRole("heading", { name: "Podobné akce" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Středeční florbal/ })).toHaveAttribute(
      "href",
      "/events/e2",
    )
    expect(screen.getByRole("link", { name: /Páteční florbal/ })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith("events/e1/similar")
  })

  it("shows nothing when there are no similar events", async () => {
    respondWith([])
    const { container } = renderIt()

    await vi.waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(screen.queryByRole("heading", { name: "Podobné akce" })).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })

  it("shows nothing when loading fails", async () => {
    vi.mocked(api.get).mockReturnValue({ json: () => Promise.reject(new Error("boom")) } as never)
    const { container } = renderIt()

    await vi.waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
