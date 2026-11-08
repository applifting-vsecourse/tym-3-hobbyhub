import type { ReactNode } from "react"
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type PagedSectionProps<T> = {
  /** For the heading, which names the section. */
  headingId: string
  query: UseInfiniteQueryResult<InfiniteData<{ items: T[]; total: number }>>
  texts: {
    title: string
    loading: string
    loadError: string
    empty: string
    /** The button that loads the rest, for this many more. */
    more: (count: number) => string
  }
  /** Said under the heading, e.g. the seats outside the app. */
  subtitle?: ReactNode
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
}

/**
 * One titled list of people on the organizer's tabs (F-05.6), loaded a page
 * at a time: the decided requests under the waiting ones, the seats taken and
 * given back on the participants tab.
 */
export function PagedSection<T>({
  headingId,
  query,
  texts,
  subtitle,
  getKey,
  renderItem,
}: PagedSectionProps<T>) {
  const { t } = useTranslation()
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0

  const loadError = (onRetry: () => void) => (
    <Alert variant="destructive">
      <AlertTitle>{texts.loadError}</AlertTitle>
      <AlertDescription className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
        >
          {t("participationRequests.manage.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  )

  let content
  if (query.isPending) {
    content = (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={texts.loading}
        />
      </div>
    )
  } else if (query.isError && items.length === 0) {
    content = loadError(() => void query.refetch())
  } else if (items.length === 0) {
    content = <p className="typo-body text-muted-foreground">{texts.empty}</p>
  } else {
    content = (
      <>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={getKey(item)}>{renderItem(item)}</li>
          ))}
        </ul>
        {query.isFetchNextPageError ? (
          // A later page failed: keep what is loaded and retry just that page.
          loadError(() => void query.fetchNextPage())
        ) : query.hasNextPage ? (
          <Button
            variant="outline"
            className="self-center"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {texts.more(total - items.length)}
          </Button>
        ) : null}
      </>
    )
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="flex items-baseline gap-2 typo-h3 text-foreground"
        >
          {texts.title}
          {query.data ? <span className="typo-body text-muted-foreground">{total}</span> : null}
        </h2>
        {subtitle}
      </div>
      {content}
    </section>
  )
}
