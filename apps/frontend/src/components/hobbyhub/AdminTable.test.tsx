import { render, screen, within } from "@testing-library/react"

import { AdminTable } from "@/components/hobbyhub/AdminTable"

type Row = { id: string; name: string; email: string }

const rows: Row[] = [
  { id: "u1", name: "Jana Nováková", email: "jana@example.com" },
  { id: "u2", name: "Petr Svoboda", email: "petr@example.com" },
]

const renderTable = () =>
  render(
    <AdminTable<Row>
      label="Uživatelé"
      rows={rows}
      rowKey={(row) => row.id}
      primary={{ key: "name", header: "Jméno", cell: (row) => row.name }}
      columns={[{ key: "email", header: "E-mail", cell: (row) => row.email }]}
    />,
  )

describe("AdminTable", () => {
  it("is a table with a header row for wide screens", () => {
    renderTable()

    const table = screen.getByRole("table", { name: "Uživatelé" })
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Jméno", "E-mail"])
    expect(within(table).getAllByRole("row")).toHaveLength(3)
  })

  // DESIGN.md: below `md` every row stacks into lines, never a card.
  it("is a list of rows with labelled values for phones", () => {
    renderTable()

    const list = screen.getByRole("list", { name: "Uživatelé" })
    const [first, ...rest] = within(list).getAllByRole("listitem")
    expect(rest).toHaveLength(1)
    if (!first) throw new Error("no rows")
    expect(first).toHaveTextContent("Jana Nováková")
    expect(within(first).getByRole("term")).toHaveTextContent("E-mail")
    expect(within(first).getByRole("definition")).toHaveTextContent("jana@example.com")
  })
})
