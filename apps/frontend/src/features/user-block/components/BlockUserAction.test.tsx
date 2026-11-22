import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { BlockUserAction } from "@/features/user-block/components/BlockUserAction"

// jsdom has no matchMedia; pretend to be a desktop so the sheet renders as a dialog.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Every request answers with `status`; the sent ones are kept.
const server = (status = 204) => {
  const sent: { method: string; url: string; body: unknown }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const text = await request.text()
      sent.push({ method: request.method, url: request.url, body: text ? JSON.parse(text) : null })
      return new Response(null, { status })
    }),
  )
  return sent
}

const renderAction = (isBlockedByMe: boolean) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <BlockUserAction user={{ id: "u2", name: "Petr", isBlockedByMe }} />
    </QueryClientProvider>,
  )

describe("BlockUserAction", () => {
  // #65: blocking undoes seats and memberships for good, so it asks first.
  it("blocks the person only after the confirmation", async () => {
    const user = userEvent.setup()
    const sent = server()
    await renderAction(false)

    await user.click(screen.getByRole("button", { name: "Zablokovat" }))
    const dialog = await screen.findByRole("dialog", { name: "Zablokovat uživatele Petr?" })
    expect(dialog).toHaveTextContent("Po odblokování se nic z toho neobnoví.")
    expect(sent).toEqual([])

    await user.click(screen.getAllByRole("button", { name: "Zablokovat" }).at(-1)!)

    await waitFor(() =>
      expect(sent).toEqual([expect.objectContaining({ method: "POST", body: { userId: "u2" } })]),
    )
    expect(sent[0]?.url).toMatch(/\/blocks$/)
  })

  it("sends nothing when the person goes back", async () => {
    const user = userEvent.setup()
    const sent = server()
    await renderAction(false)

    await user.click(screen.getByRole("button", { name: "Zablokovat" }))
    await user.click(await screen.findByRole("button", { name: "Zpět" }))

    expect(sent).toEqual([])
  })

  it("says so when the block fails, and keeps the sheet open", async () => {
    const user = userEvent.setup()
    server(500)
    await renderAction(false)

    await user.click(screen.getByRole("button", { name: "Zablokovat" }))
    await screen.findByRole("dialog")
    await user.click(screen.getAllByRole("button", { name: "Zablokovat" }).at(-1)!)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Uživatele se nepodařilo zablokovat.",
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("explains a block of mine and takes it back at once", async () => {
    const user = userEvent.setup()
    const sent = server()
    await renderAction(true)

    expect(screen.getByText(/Uživatele Petr máte zablokovaného/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Odblokovat" }))

    await waitFor(() =>
      expect(sent).toEqual([expect.objectContaining({ method: "DELETE", body: null })]),
    )
    expect(sent[0]?.url).toMatch(/\/blocks\/u2$/)
  })
})
