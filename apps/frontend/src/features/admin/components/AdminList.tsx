import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { AdminTable, type AdminColumn } from "@/components/hobbyhub/AdminTable"
import { SearchField } from "@/components/hobbyhub/SearchField"
import { Button } from "@/components/ui/button"

import { ADMIN_PAGE_SIZE, ADMIN_SEARCH_MAX_LENGTH } from "@/features/admin/api/adminSchemas"
import { AdminState } from "@/features/admin/components/AdminState"

const SEARCH_DELAY_MS = 300

type AdminListProps<T> = {
  title: string
  /** What the search looks in, as its accessible name and placeholder. */
  searchLabel: string
  search: string
  offset: number
  /** Puts the search and the page into the URL; a new search starts at 0. */
  onChange: (next: { search: string; offset: number }) => void
  query: {
    data: { items: T[]; total: number } | undefined
    isPending: boolean
    isError: boolean
    refetch: () => unknown
  }
  empty: string
  rowKey: (row: T) => string
  primary: AdminColumn<T>
  columns: AdminColumn<T>[]
}

/** #238: a page of records with a search, in the administration. */
export function AdminList<T>({
  title,
  searchLabel,
  search,
  offset,
  onChange,
  query,
  empty,
  rowKey,
  primary,
  columns,
}: AdminListProps<T>) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState(search)
  const [shownSearch, setShownSearch] = useState(search)

  // Back and forward change the URL under the field: follow it while rendering.
  // Our own search changes it too, to the trimmed text; that must not eat the
  // space just typed between two words.
  if (search !== shownSearch) {
    setShownSearch(search)
    if (typed.trim() !== search) setTyped(search)
  }

  useEffect(() => {
    const next = typed.trim()
    if (next === search) return
    const timer = window.setTimeout(() => onChange({ search: next, offset: 0 }), SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [typed, search, onChange])

  const page = query.data
  const shownTo = page ? Math.min(offset + page.items.length, page.total) : 0

  return (
    <div className="flex flex-col gap-6">
      <h1 className="typo-h1 text-foreground">{title}</h1>
      <SearchField
        label={searchLabel}
        placeholder={searchLabel}
        value={typed}
        maxLength={ADMIN_SEARCH_MAX_LENGTH}
        onChange={(event) => setTyped(event.target.value)}
        className="md:max-w-md"
      />

      {page ? (
        page.items.length === 0 ? (
          <p className="py-8 text-center typo-body text-muted-foreground">
            {search ? t("admin.list.noMatch") : empty}
          </p>
        ) : (
          <>
            <AdminTable
              label={title}
              rows={page.items}
              rowKey={rowKey}
              primary={primary}
              columns={columns}
            />
            <nav
              aria-label={t("admin.list.pages")}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <p className="typo-small text-muted-foreground">
                {t("admin.list.range", { from: offset + 1, to: shownTo, total: page.total })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 md:h-9"
                  disabled={offset === 0}
                  onClick={() =>
                    onChange({ search, offset: Math.max(0, offset - ADMIN_PAGE_SIZE) })
                  }
                >
                  {t("admin.list.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 md:h-9"
                  disabled={offset + ADMIN_PAGE_SIZE >= page.total}
                  onClick={() => onChange({ search, offset: offset + ADMIN_PAGE_SIZE })}
                >
                  {t("admin.list.next")}
                </Button>
              </div>
            </nav>
          </>
        )
      ) : (
        <AdminState query={query} />
      )}
    </div>
  )
}
