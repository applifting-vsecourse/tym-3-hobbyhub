import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { OrganizerPanel } from "@/features/participation-request/components/OrganizerPanel"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  api: { get },
}))

beforeEach(() => {
  get.mockReset()
})

const renderPanel = (total: number) => {
  get.mockReturnValue({ json: () => Promise.resolve({ items: [], total }) })
  return renderWithRouter(
    <QueryClientProvider client={new QueryClient()}>
      <OrganizerPanel eventId="e1" />
    </QueryClientProvider>,
  )
}

describe("OrganizerPanel", () => {
  it("leads the organizer to the requests of their event", async () => {
    await renderPanel(2)

    expect(screen.getByText("Tuto akci pořádáš.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Žádosti a přehled účastníků" })).toHaveAttribute(
      "href",
      "/events/e1/participants?tab=requests",
    )
    expect(await screen.findByText("2 čekající žádosti")).toBeInTheDocument()
  })

  it("shows the count even when nobody is waiting", async () => {
    await renderPanel(0)

    expect(await screen.findByText("0 čekajících žádostí")).toBeInTheDocument()
  })
})
