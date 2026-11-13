import type { ReactNode } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type AdminColumn<T> = {
  key: string
  header: string
  cell: (row: T) => ReactNode
}

type AdminTableProps<T> = {
  rows: T[]
  rowKey: (row: T) => string
  /** The first column, the record's name; its cell renders the link to the detail. */
  primary: AdminColumn<T>
  columns: AdminColumn<T>[]
  /** Names the table for assistive technology. */
  label: string
}

/**
 * DESIGN.md "Tables are for the administration only": a dense table from
 * `md`, below it each row stacks into lines under a hairline, never a card.
 */
export function AdminTable<T>({ rows, rowKey, primary, columns, label }: AdminTableProps<T>) {
  const primaryCell = (row: T) => (
    <span className="font-medium text-foreground">{primary.cell(row)}</span>
  )

  return (
    <>
      <Table
        aria-label={label}
        className="max-md:hidden"
      >
        <TableHeader>
          <TableRow>
            <TableHead>{primary.header}</TableHead>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              <TableCell>{primaryCell(row)}</TableCell>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className="text-muted-foreground"
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ul
        aria-label={label}
        className="divide-y divide-border md:hidden"
      >
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="flex flex-col gap-1 py-3"
          >
            <span className="typo-body">{primaryCell(row)}</span>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 typo-small">
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="contents"
                >
                  <dt className="text-muted-foreground">{column.header}</dt>
                  <dd className="min-w-0 break-words text-foreground">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
