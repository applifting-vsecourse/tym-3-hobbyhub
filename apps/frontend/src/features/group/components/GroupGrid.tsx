import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type GroupGridProps<T> = {
  items: T[] | undefined
  isPending: boolean
  error: Error | null
  onRetry: () => void
  /** One sentence saying what would appear here. */
  empty: ReactNode
  renderItem: (item: T) => ReactNode
  getKey: (item: T) => string
}

/** A list of group cards with its loading, empty and error states. */
export function GroupGrid<T>({
  items,
  isPending,
  error,
  onRetry,
  empty,
  renderItem,
  getKey,
}: GroupGridProps<T>) {
  const { t } = useTranslation()

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={t("groups.list.loading")}
        />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("groups.list.loadError")}</AlertTitle>
        <AlertDescription className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            {t("groups.form.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!items?.length) return <div className="typo-body text-muted-foreground">{empty}</div>

  return (
    <ul className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}
