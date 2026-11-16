import { act, fireEvent, render, screen } from "@testing-library/react"

import { AdminList } from "@/features/admin/components/AdminList"

type Row = { id: string; name: string }

const rowsOf = (count: number, from = 0): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `r${from + index}`,
    name: `Záznam ${from + index + 1}`,
  }))

type Query = Parameters<typeof AdminList<Row>>[0]["query"]

const renderList = ({
  query,
  search = "",
  offset = 0,
  onChange = vi.fn(),
}: {
  query: Query
  search?: string
  offset?: number
  onChange?: (next: { search: string; offset: number }) => void
}) =>
  render(
    <AdminList<Row>
      title="Uživatelé"
      searchLabel="Hledat podle jména"
      search={search}
      offset={offset}
      onChange={onChange}
      query={query}
      empty="Zatím tu nejsou žádní uživatelé."
      rowKey={(row) => row.id}
      primary={{ key: "name", header: "Jméno", cell: (row) => row.name }}
      columns={[]}
    />,
  )

const loaded = (items: Row[], total = items.length): Query => ({
  data: { items, total },
  isPending: false,
  isError: false,
  refetch: vi.fn(),
})

describe("AdminList", () => {
  it("says it is loading", () => {
    renderList({ query: { data: undefined, isPending: true, isError: false, refetch: vi.fn() } })

    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("offers a retry when loading failed", () => {
    const refetch = vi.fn()
    renderList({ query: { data: undefined, isPending: false, isError: true, refetch } })

    expect(screen.getByText("Data se nepodařilo načíst.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(refetch).toHaveBeenCalled()
  })

  it("tells an empty list from a search that found nothing", () => {
    const { unmount } = renderList({ query: loaded([]) })
    expect(screen.getByText("Zatím tu nejsou žádní uživatelé.")).toBeInTheDocument()
    unmount()

    renderList({ query: loaded([]), search: "xyz" })
    expect(screen.getByText("Hledání nic nenašlo.")).toBeInTheDocument()
  })

  it("pages by twenty and knows the ends", () => {
    const onChange = vi.fn()
    renderList({ query: loaded(rowsOf(20, 20), 45), offset: 20, onChange })

    expect(screen.getByText("21–40 z 45")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Další" }))
    expect(onChange).toHaveBeenLastCalledWith({ search: "", offset: 40 })
    fireEvent.click(screen.getByRole("button", { name: "Předchozí" }))
    expect(onChange).toHaveBeenLastCalledWith({ search: "", offset: 0 })
  })

  it("cannot go before the first page or past the last one", () => {
    renderList({ query: loaded(rowsOf(5)) })

    expect(screen.getByRole("button", { name: "Předchozí" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Další" })).toBeDisabled()
  })

  it("searches once the typing pauses, from the first page", () => {
    vi.useFakeTimers()
    try {
      const onChange = vi.fn()
      renderList({ query: loaded(rowsOf(3)), offset: 20, onChange })

      fireEvent.change(screen.getByLabelText("Hledat podle jména"), {
        target: { value: " jana " },
      })
      expect(onChange).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(onChange).toHaveBeenCalledWith({ search: "jana", offset: 0 })
    } finally {
      vi.useRealTimers()
    }
  })
})
