import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"

import { renderWithRouter } from "@/test/renderWithRouter"

import { adminUsersQueryOptions } from "@/features/admin/api/adminQueryOptions"
import { adminReportsQueryOptions } from "@/features/admin/api/reportQueryOptions"
import type { AdminReportListItem } from "@/features/admin/api/reportSchemas"
import { AdminAttention } from "@/features/admin/components/AdminAttention"

vi.mock("@/features/admin/lib/admin-api", () => ({ adminApi: { get: vi.fn() } }))

const aReport = (overrides: Partial<AdminReportListItem> = {}): AdminReportListItem => ({
  id: "r1",
  status: "NEW",
  createdAt: new Date("2030-01-01T10:00:00Z"),
  target: { type: "EVENT", id: "e1", name: "Čtvrteční florbal" },
  reason: { id: "reason1", name: "Podvod" },
  reporter: { id: "u1", name: "Jana" },
  assignee: null,
  otherOpenReports: 0,
  ...overrides,
})

const render = async ({
  events = [] as AdminReportListItem[],
  people = [] as AdminReportListItem[],
  unverified = 0,
}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const open = { status: "OPEN", mine: false, offset: 0 } as const
  queryClient.setQueryData(adminReportsQueryOptions({ ...open, targetType: "EVENT" }).queryKey, {
    items: events,
    total: events.length,
  })
  queryClient.setQueryData(adminReportsQueryOptions({ ...open, targetType: "USER" }).queryKey, {
    items: people,
    total: people.length,
  })
  queryClient.setQueryData(adminUsersQueryOptions("", 0, "unverified").queryKey, {
    items: [],
    total: unverified,
  })
  await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <AdminAttention />
    </QueryClientProvider>,
  )
}

// #273: one page for what waits for an administrator.
describe("AdminAttention", () => {
  it("lists reported events and people with their counts and a way to all of them", async () => {
    await render({
      events: [aReport()],
      people: [aReport({ id: "r2", target: { type: "USER", id: "u2", name: "Petr" } })],
      unverified: 3,
    })

    const events = screen.getByRole("region", { name: /Nahlášené akce/ })
    expect(
      within(events)
        .getAllByRole("link", { name: "Čtvrteční florbal" })
        .every((link) => link.getAttribute("href") === "/admin/events/e1"),
    ).toBe(true)
    expect(within(events).getByRole("link", { name: "Zobrazit vše" })).toHaveAttribute(
      "href",
      "/admin/reports?target=EVENT",
    )
    const people = screen.getByRole("region", { name: /Nahlášení lidé/ })
    expect(within(people).getAllByRole("link", { name: "Petr" }).length).toBeGreaterThan(0)
    const unverified = screen.getByRole("region", { name: /Neověřené účty/ })
    expect(within(unverified).getByText("3 účty zatím neověřily e-mail.")).toBeVisible()
    expect(within(unverified).getByRole("link", { name: "Zobrazit vše" })).toHaveAttribute(
      "href",
      "/admin/users?filter=unverified",
    )
  })

  it("says when nothing waits", async () => {
    await render({})

    expect(screen.getByText("Žádná nahlášená akce nečeká.")).toBeVisible()
    expect(screen.getByText("Žádný nahlášený člověk nečeká.")).toBeVisible()
    expect(screen.getByText("Každý má ověřený e-mail.")).toBeVisible()
    expect(screen.queryByRole("link", { name: "Zobrazit vše" })).not.toBeInTheDocument()
  })
})
