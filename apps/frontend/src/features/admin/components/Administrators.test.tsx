import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithRouter } from "@/test/renderWithRouter"

import { administratorsQueryOptions } from "@/features/admin/api/adminQueryOptions"
import type { Administrator } from "@/features/admin/api/adminSchemas"
import { Administrators } from "@/features/admin/components/Administrators"
import { useAdminSession } from "@/features/admin/hooks/useAdminSession"

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/features/admin/lib/admin-api", () => ({ adminApi: { post } }))
vi.mock("@/features/admin/hooks/useAdminSession", () => ({ useAdminSession: vi.fn() }))

const anAdministrator = (overrides: Partial<Administrator>): Administrator => ({
  id: "a2",
  name: "Petr Svoboda",
  email: "petr@example.com",
  createdAt: new Date("2026-11-01T10:00:00Z"),
  status: "ACTIVE",
  createdBy: { id: "a1", name: "Jana Nováková" },
  deactivatedAt: null,
  deactivatedBy: null,
  ...overrides,
})

const me = anAdministrator({
  id: "a1",
  name: "Jana Nováková",
  email: "jana@example.com",
  createdBy: null,
})

const renderPage = async (administrators: Administrator[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(administratorsQueryOptions().queryKey, administrators)
  const result = await renderWithRouter(
    <QueryClientProvider client={queryClient}>
      <Administrators />
    </QueryClientProvider>,
  )
  return { ...result, queryClient }
}

// The phone layout repeats every row; the table is what these tests read.
const rowOf = (name: string) => {
  const table = screen.getByRole("table", { name: "Správci" })
  const row = within(table)
    .getAllByRole("row")
    .find((candidate) => within(candidate).queryByText(name))
  if (!row) throw new Error(`No row for ${name}`)
  return within(row)
}

describe("Administrators", () => {
  beforeEach(() => {
    post.mockReset()
    vi.mocked(useAdminSession).mockReturnValue({
      administrator: { id: me.id, name: me.name, email: me.email },
    })
  })

  it("never offers removing oneself, nor the last active administrator", async () => {
    await renderPage([me, anAdministrator({ status: "INVITED" })])

    expect(rowOf("Jana Nováková").getByText("To jste vy")).toBeInTheDocument()
    expect(rowOf("Jana Nováková").queryByRole("button", { name: "Odebrat" })).toBeNull()
    expect(rowOf("Petr Svoboda").getByRole("button", { name: "Zrušit pozvánku" })).toBeEnabled()
  })

  it("keeps the last active colleague", async () => {
    vi.mocked(useAdminSession).mockReturnValue({
      administrator: { id: "someone-else", name: "X", email: "x@example.com" },
    })
    await renderPage([me])

    expect(rowOf("Jana Nováková").getByText("Poslední aktivní správce")).toBeInTheDocument()
  })

  it("shows who added and removed whom, and what can be done with each", async () => {
    await renderPage([
      me,
      anAdministrator({ status: "INVITED" }),
      anAdministrator({
        id: "a3",
        name: "Eva Malá",
        status: "DEACTIVATED",
        deactivatedAt: new Date("2026-11-10T10:00:00Z"),
        deactivatedBy: { id: "a1", name: "Jana Nováková" },
      }),
    ])

    expect(rowOf("Jana Nováková").getByText(/^server, /)).toBeInTheDocument()
    expect(rowOf("Petr Svoboda").getByText("Pozvaný")).toBeInTheDocument()
    expect(
      rowOf("Petr Svoboda").getByRole("button", { name: "Poslat pozvánku znovu" }),
    ).toBeEnabled()
    expect(rowOf("Eva Malá").getByText("Odebraný")).toBeInTheDocument()
    expect(rowOf("Eva Malá").getByText(/^Jana Nováková, /)).toBeInTheDocument()
    expect(rowOf("Eva Malá").getByRole("button", { name: "Obnovit přístup" })).toBeEnabled()
  })

  it("removes a colleague only after confirming", async () => {
    const user = userEvent.setup()
    const colleague = anAdministrator({})
    post.mockReturnValue({
      json: () => Promise.resolve({ ...colleague, status: "DEACTIVATED" }),
    })
    await renderPage([me, colleague])

    await user.click(rowOf("Petr Svoboda").getByRole("button", { name: "Odebrat" }))
    expect(post).not.toHaveBeenCalled()

    const dialog = await screen.findByRole("dialog", { name: "Odebrat správce Petr Svoboda?" })
    await user.click(within(dialog).getByRole("button", { name: "Odebrat" }))

    expect(post).toHaveBeenCalledWith("administrators/a2/deactivate")
  })
})
