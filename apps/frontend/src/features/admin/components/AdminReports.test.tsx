import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import { adminReportsQueryOptions } from "@/features/admin/api/reportQueryOptions"
import type { AdminReportFilter, AdminReportListItem } from "@/features/admin/api/reportSchemas"
import { AdminReports } from "@/features/admin/components/AdminReports"

vi.mock("@/features/admin/lib/admin-api", () => ({ adminApi: { get: vi.fn() } }))

const OPEN: AdminReportFilter = { status: "OPEN", mine: false, offset: 0 }

const aReport = (overrides: Partial<AdminReportListItem> = {}): AdminReportListItem => ({
  id: "r1",
  status: "NEW",
  createdAt: new Date("2030-01-01T10:00:00Z"),
  target: { type: "USER", id: "u2", name: "Petr" },
  reason: { id: "reason1", name: "Obtěžování nebo vyhrožování" },
  reporter: { id: "u1", name: "Jana" },
  assignee: null,
  otherOpenReports: 2,
  ...overrides,
})

const renderQueue = async (
  page: { items: AdminReportListItem[]; total: number },
  filter: AdminReportFilter = OPEN,
) => {
  const onChange = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(adminReportsQueryOptions(filter).queryKey, page)
  await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <AdminReports
        filter={filter}
        onChange={onChange}
      />
    </QueryClientProvider>,
  )
  return { onChange, user: userEvent.setup() }
}

// #240, #73, ADR-0023.
describe("AdminReports", () => {
  it("lists a report with its target, who reported it and how many others are open", async () => {
    await renderQueue({ items: [aReport()], total: 1 })

    const table = within(screen.getByRole("table", { name: "Nahlášení" }))
    expect(table.getByRole("link", { name: "Obtěžování nebo vyhrožování" })).toHaveAttribute(
      "href",
      "/admin/reports/r1",
    )
    expect(table.getByRole("link", { name: "Petr" })).toHaveAttribute("href", "/admin/users/u2")
    expect(table.getByRole("link", { name: "Jana" })).toHaveAttribute("href", "/admin/users/u1")
    expect(table.getByText("+2 další otevřená")).toBeInTheDocument()
    expect(table.getByText("Nové")).toBeInTheDocument()
  })

  it("says the queue is empty when nothing is open", async () => {
    await renderQueue({ items: [], total: 0 })

    expect(screen.getByText(/Žádné otevřené nahlášení/)).toBeInTheDocument()
  })

  it("says nothing matches a narrower filter", async () => {
    const filter: AdminReportFilter = { ...OPEN, mine: true }
    await renderQueue({ items: [], total: 0 }, filter)

    expect(screen.getByText("Filtru neodpovídá žádné nahlášení.")).toBeInTheDocument()
  })

  it("filters to the reports in one's own hands, from the first page", async () => {
    const { onChange, user } = await renderQueue(
      { items: [aReport()], total: 1 },
      {
        ...OPEN,
        offset: 20,
      },
    )

    await user.click(screen.getByRole("checkbox", { name: "Jen přiřazená mně" }))

    expect(onChange).toHaveBeenCalledWith({ status: "OPEN", mine: true, offset: 0 })
  })

  it("filters by state and by what is reported", async () => {
    const { onChange, user } = await renderQueue({ items: [aReport()], total: 1 })

    await user.click(screen.getByRole("combobox", { name: "Stav" }))
    await user.click(await screen.findByRole("option", { name: "Vyřešená" }))
    expect(onChange).toHaveBeenLastCalledWith({ status: "RESOLVED", mine: false, offset: 0 })

    await user.click(screen.getByRole("combobox", { name: "Co je nahlášeno" }))
    await user.click(await screen.findByRole("option", { name: "Akce" }))
    expect(onChange).toHaveBeenLastCalledWith({
      status: "OPEN",
      targetType: "EVENT",
      mine: false,
      offset: 0,
    })
  })
})
