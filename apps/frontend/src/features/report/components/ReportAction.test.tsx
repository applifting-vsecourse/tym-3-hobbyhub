import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { renderWithRouter } from "@/test/renderWithRouter"

import type { ReportTarget } from "@/features/report/api/reportSchemas"
import { ReportAction } from "@/features/report/components/ReportAction"

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

const REASONS = [
  { id: "reason1", name: "Obtěžování nebo vyhrožování" },
  { id: "reason6", name: "Jiné" },
]
const TEXT = "Po akci mi opakovaně posílá zprávy."

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

// The reasons always load; the report answers with `report`.
const server = (report: Response) => {
  const reports: unknown[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      if (request.url.endsWith("/report-reasons")) return json(200, REASONS)
      reports.push(await request.json())
      return report
    }),
  )
  return reports
}

const renderAction = (target: ReportTarget, targetName: string) =>
  renderWithRouter(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ReportAction
        target={target}
        targetName={targetName}
      />
    </QueryClientProvider>,
  )

const fillIn = async (user: ReturnType<typeof userEvent.setup>, text = TEXT) => {
  await user.click(screen.getByRole("combobox", { name: "Důvod" }))
  await user.click(await screen.findByRole("option", { name: "Obtěžování nebo vyhrožování" }))
  await user.type(screen.getByLabelText("Co se stalo"), text)
  await user.click(screen.getByRole("button", { name: "Odeslat nahlášení" }))
}

// #240, ADR-0023.
describe("ReportAction", () => {
  it("tells the reporter of a person that it asks for a block, which the other never learns of", async () => {
    server(json(201, {}))
    const user = userEvent.setup()
    await renderAction({ type: "USER", id: "u2" }, "Petr")

    await user.click(screen.getByRole("button", { name: "Nahlásit uživatele" }))

    expect(await screen.findByRole("heading", { name: "Nahlásit uživatele" })).toBeVisible()
    expect(screen.getByText(/Nahlašuješ uživatele Petr/)).toBeInTheDocument()
    expect(screen.getByText(/žádost o blokaci/)).toBeInTheDocument()
    expect(screen.getByText(/nedozví/)).toBeInTheDocument()
  })

  it("asks for a reason and at least 10 characters before sending anything", async () => {
    const reports = server(json(201, {}))
    const user = userEvent.setup()
    await renderAction({ type: "EVENT", id: "e1" }, "Čtvrteční florbal")

    await user.click(screen.getByRole("button", { name: "Nahlásit akci" }))
    await user.type(await screen.findByLabelText("Co se stalo"), "Spam")
    await user.click(screen.getByRole("button", { name: "Odeslat nahlášení" }))

    expect(await screen.findByText("Vyber důvod nahlášení.")).toBeInTheDocument()
    expect(screen.getByText("Napiš aspoň 10 znaků.")).toBeInTheDocument()
    expect(reports).toEqual([])
  })

  it("sends the report with the trimmed text and closes the sheet", async () => {
    const reports = server(json(201, { id: "r1", createdAt: "2030-01-01T10:00:00.000Z" }))
    const user = userEvent.setup()
    await renderAction({ type: "EVENT", id: "e1" }, "Čtvrteční florbal")

    await user.click(screen.getByRole("button", { name: "Nahlásit akci" }))
    await fillIn(user, `  ${TEXT}  `)

    await vi.waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Nahlásit akci" })).not.toBeInTheDocument(),
    )
    expect(reports).toEqual([
      { targetType: "EVENT", targetId: "e1", reasonId: "reason1", text: TEXT },
    ])
  })

  it("says when the reporter has reported this already", async () => {
    server(
      json(409, {
        statusCode: 409,
        message: ["You have an open report about this already"],
        violations: ["ALREADY_REPORTED"],
      }),
    )
    const user = userEvent.setup()
    await renderAction({ type: "USER", id: "u2" }, "Petr")

    await user.click(screen.getByRole("button", { name: "Nahlásit uživatele" }))
    await fillIn(user)

    expect(
      await screen.findByText("Tohle už máš nahlášené. Dáme ti vědět, až to správci vyřídí."),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Nahlásit uživatele" })).toBeVisible()
  })

  it("says when the target is gone", async () => {
    server(json(404, { statusCode: 404, message: "User not found" }))
    const user = userEvent.setup()
    await renderAction({ type: "USER", id: "u2" }, "Petr")

    await user.click(screen.getByRole("button", { name: "Nahlásit uživatele" }))
    await fillIn(user)

    expect(await screen.findByText("Tohle už v HobbyHubu není.")).toBeInTheDocument()
  })
})
