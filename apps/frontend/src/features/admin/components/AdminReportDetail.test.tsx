import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HTTPError } from "ky"

import { renderWithRouter } from "@/test/renderWithRouter"

import { adminReportQueryOptions } from "@/features/admin/api/reportQueryOptions"
import type { AdminReportDetail as Detail } from "@/features/admin/api/reportSchemas"
import { AdminReportDetail } from "@/features/admin/components/AdminReportDetail"
import { useAdminSession } from "@/features/admin/hooks/useAdminSession"

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/features/admin/lib/admin-api", () => ({ adminApi: { get, post } }))
vi.mock("@/features/admin/hooks/useAdminSession", () => ({ useAdminSession: vi.fn() }))

const NOTE = "Dvojice zablokována, nahlášení odpovídá."

const aReport = (overrides: Partial<Detail> = {}): Detail => ({
  id: "r1",
  status: "NEW",
  createdAt: new Date("2030-01-01T10:00:00Z"),
  target: { type: "USER", id: "u2", name: "Petr" },
  reason: { id: "reason1", name: "Obtěžování nebo vyhrožování" },
  reporter: { id: "u1", name: "Jana" },
  assignee: null,
  text: "Po akci mi opakovaně posílá zprávy.",
  resolutionNote: null,
  resolvedAt: null,
  otherOpenReports: [],
  history: [
    { action: "CREATED", at: new Date("2030-01-01T10:00:00Z"), admin: null, description: null },
  ],
  ...overrides,
})

// What the server answers to a step: the report as it is afterwards.
const answer = (report: Detail) =>
  post.mockReturnValueOnce({ json: () => Promise.resolve(JSON.parse(JSON.stringify(report))) })

const renderDetail = async (report: Detail) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(adminReportQueryOptions(report.id).queryKey, report)
  get.mockReturnValue({ json: () => Promise.resolve(JSON.parse(JSON.stringify(report))) })
  await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <AdminReportDetail reportId={report.id} />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

// #240, #73, ADR-0023.
describe("AdminReportDetail", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    vi.mocked(useAdminSession).mockReturnValue({
      administrator: { id: "a1", name: "Správkyně", email: "a1@example.com" },
    })
  })

  it("shows what was reported, by whom and what happened", async () => {
    await renderDetail(aReport())

    expect(
      screen.getByRole("heading", { level: 1, name: "Nahlášení uživatele Petr" }),
    ).toBeVisible()
    expect(screen.getByText("Po akci mi opakovaně posílá zprávy.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Jana" })).toHaveAttribute("href", "/admin/users/u1")
    expect(screen.getByText("Přijato od uživatele Jana")).toBeInTheDocument()
  })

  it("lets the administrator take a new report over", async () => {
    const user = await renderDetail(aReport())
    answer(aReport({ status: "IN_PROGRESS", assignee: { id: "a1", name: "Správkyně" } }))

    await user.click(screen.getByRole("button", { name: "Převzít" }))

    expect(post).toHaveBeenCalledWith("reports/r1/assign", { json: {} })
  })

  it("does not offer taking over a report one has already", async () => {
    await renderDetail(
      aReport({ status: "IN_PROGRESS", assignee: { id: "a1", name: "Správkyně" } }),
    )

    expect(screen.queryByRole("button", { name: "Převzít" })).toBeNull()
    expect(screen.getByRole("button", { name: "Předat kolegovi" })).toBeInTheDocument()
  })

  it("resolves only with a note, and sends it trimmed", async () => {
    const user = await renderDetail(aReport())
    answer(aReport({ status: "RESOLVED", resolutionNote: NOTE, resolvedAt: new Date() }))

    await user.click(screen.getByRole("button", { name: "Vyřešit" }))
    const sheet = within(await screen.findByRole("dialog", { name: "Vyřešit nahlášení" }))
    await user.click(sheet.getByRole("button", { name: "Vyřešit" }))
    expect(await sheet.findByText("Napište poznámku, aspoň 10 znaků")).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()

    await user.type(sheet.getByLabelText("Poznámka k řešení"), `  ${NOTE}  `)
    await user.click(sheet.getByRole("button", { name: "Vyřešit" }))

    await vi.waitFor(() =>
      expect(post).toHaveBeenCalledWith("reports/r1/resolve", { json: { note: NOTE } }),
    )
  })

  it("offers only reopening a resolved report", async () => {
    const user = await renderDetail(
      aReport({
        status: "RESOLVED",
        assignee: { id: "a2", name: "Kolega" },
        resolutionNote: NOTE,
        resolvedAt: new Date("2030-01-02T10:00:00Z"),
      }),
    )
    answer(aReport({ status: "IN_PROGRESS", assignee: { id: "a1", name: "Správkyně" } }))

    expect(screen.getByText(NOTE)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Vyřešit" })).toBeNull()
    await user.click(screen.getByRole("button", { name: "Znovu otevřít" }))

    expect(post).toHaveBeenCalledWith("reports/r1/reopen")
  })

  it("says when a colleague changed the report meanwhile", async () => {
    const user = await renderDetail(aReport())
    const response = new Response("{}", { status: 409 })
    const error = new HTTPError(
      response,
      new Request("http://x/api/admin/reports/r1/assign"),
      {} as never,
    )
    Object.assign(error, { data: { violations: ["CHANGED"] } })
    post.mockReturnValueOnce({ json: () => Promise.reject(error) })

    await user.click(screen.getByRole("button", { name: "Převzít" }))

    expect(
      await screen.findByText("Nahlášení mezitím změnil kolega. Stránka ukazuje aktuální stav."),
    ).toBeInTheDocument()
  })

  it("offers blocking the reporter and the reported person from each other", async () => {
    const user = await renderDetail(aReport())

    expect(screen.getByText(/Jana a Petr se po zablokování navzájem neuvidí/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Zablokovat dvojici" }))

    expect(
      await screen.findByRole("heading", { name: "Zablokovat uživatele Jana vůči…" }),
    ).toBeVisible()
    // The other person is fixed by the report: no picker to choose someone else.
    expect(screen.queryByRole("combobox", { name: "Druhý uživatel" })).toBeNull()
    expect(screen.getAllByText("Petr").length).toBeGreaterThan(0)
  })
})
