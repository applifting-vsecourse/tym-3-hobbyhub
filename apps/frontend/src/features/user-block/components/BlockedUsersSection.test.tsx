import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import { BlockedUsersSection } from "@/features/user-block/components/BlockedUsersSection"

afterEach(() => {
  vi.unstubAllGlobals()
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const PETR = { id: "u2", name: "Petr", image: null, blockedAt: "2026-11-10T10:00:00.000Z" }

// The list answers with `list`; anything else (unblocking) with 204.
const server = (list: Response) => {
  const sent: { method: string; url: string }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn((request: Request) => {
      sent.push({ method: request.method, url: request.url })
      return Promise.resolve(
        request.method === "GET" ? list.clone() : new Response(null, { status: 204 }),
      )
    }),
  )
  return sent
}

const renderSection = () =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <BlockedUsersSection />
    </QueryClientProvider>,
  )

describe("BlockedUsersSection", () => {
  it("says when nobody is blocked", async () => {
    server(json(200, []))
    await renderSection()

    expect(await screen.findByText("Nikoho nemáte zablokovaného.")).toBeInTheDocument()
  })

  it("lists the people I blocked, each with a way to unblock", async () => {
    const user = userEvent.setup()
    const sent = server(json(200, [PETR]))
    await renderSection()

    expect(await screen.findByRole("link", { name: "Petr" })).toHaveAttribute("href", "/profile/u2")
    await user.click(screen.getByRole("button", { name: "Odblokovat uživatele Petr" }))

    await waitFor(() => expect(sent).toContainEqual(expect.objectContaining({ method: "DELETE" })))
    expect(sent.find((request) => request.method === "DELETE")?.url).toMatch(/\/blocks\/u2$/)
  })

  it("offers to try again when the list fails", async () => {
    server(json(500, {}))
    await renderSection()

    expect(
      await screen.findByText("Zablokované uživatele se nepodařilo načíst."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zkusit znovu" })).toBeInTheDocument()
  })
})
