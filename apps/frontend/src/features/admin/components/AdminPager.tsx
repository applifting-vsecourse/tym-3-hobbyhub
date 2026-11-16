import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { ADMIN_PAGE_SIZE } from "@/features/admin/api/adminSchemas"

type AdminPagerProps = {
  offset: number
  /** How many rows the shown page has. */
  shown: number
  total: number
  onOffsetChange: (offset: number) => void
}

/** #238: "21–40 z 57" with the previous and next page, under a list in the administration. */
export function AdminPager({ offset, shown, total, onOffsetChange }: AdminPagerProps) {
  const { t } = useTranslation()
  const shownTo = Math.min(offset + shown, total)

  return (
    <nav
      aria-label={t("admin.list.pages")}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="typo-small text-muted-foreground">
        {t("admin.list.range", { from: offset + 1, to: shownTo, total })}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-11 md:h-9"
          disabled={offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - ADMIN_PAGE_SIZE))}
        >
          {t("admin.list.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-11 md:h-9"
          disabled={offset + ADMIN_PAGE_SIZE >= total}
          onClick={() => onOffsetChange(offset + ADMIN_PAGE_SIZE)}
        >
          {t("admin.list.next")}
        </Button>
      </div>
    </nav>
  )
}
