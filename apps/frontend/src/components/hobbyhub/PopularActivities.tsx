import { useId, useMemo, useRef, useState } from "react"
import { CheckIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ActivityComboboxCategory } from "@/components/hobbyhub/ActivityCombobox"
import { isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { ActivityToken } from "@/components/hobbyhub/ActivityToken"
import { FilterChip } from "@/components/hobbyhub/FilterChip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** How many tags show at first, and how many each "Načíst další" adds. */
export const POPULAR_FIRST = 15
export const POPULAR_MORE = 20

export type PopularActivity = {
  id: string
  name: string
  icon: string
  category?: ActivityComboboxCategory
  /** Place among the most popular (1 = most popular); null or missing for the rest. */
  popularityRank?: number | null
}

type PopularActivitiesProps = {
  activities: PopularActivity[]
  /** Display name of an activity; the activity feature owns the translation. */
  activityLabel: (activity: PopularActivity) => string
  chosenIds: string[]
  onToggle: (id: string) => void
}

/**
 * Rychlý výběr — the onboarding's quick pick (DESIGN.md allows tags here only):
 * the most popular activities as tags, then the rest by category and name,
 * revealed a batch at a time. A tag adds or removes the activity. An activity
 * chosen elsewhere (the search above) that has no tag on show gets one on top,
 * and keeps it, so it can be seen and taken back.
 */
export function PopularActivities({
  activities,
  activityLabel,
  chosenIds,
  onToggle,
}: PopularActivitiesProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage
  const headingId = useId()
  const [shownCount, setShownCount] = useState(POPULAR_FIRST)
  const listRef = useRef<HTMLDivElement>(null)

  const ordered = useMemo(() => {
    const collator = new Intl.Collator(language)
    const rank = (activity: PopularActivity) => activity.popularityRank ?? Number.POSITIVE_INFINITY
    return [...activities].sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.category?.order ?? Number.POSITIVE_INFINITY) -
          (b.category?.order ?? Number.POSITIVE_INFINITY) ||
        collator.compare(activityLabel(a), activityLabel(b)),
    )
  }, [activities, activityLabel, language])

  // Ids pinned on top, newest first. The ones chosen before the step opened start there.
  const isInBatch = (id: string, count: number) =>
    ordered.slice(0, count).some((activity) => activity.id === id)
  const [pinnedIds, setPinnedIds] = useState(() =>
    chosenIds.filter((id) => !isInBatch(id, POPULAR_FIRST)).reverse(),
  )
  const unpinned = chosenIds.filter(
    (id) =>
      !pinnedIds.includes(id) &&
      !isInBatch(id, shownCount) &&
      ordered.some((activity) => activity.id === id),
  )
  // Adjusting state while rendering, as React suggests for state derived from props.
  if (unpinned.length > 0) setPinnedIds([...unpinned.reverse(), ...pinnedIds])

  const pinned = pinnedIds.flatMap((id) => ordered.filter((activity) => activity.id === id))
  const shown = [
    ...pinned,
    ...ordered.slice(0, shownCount).filter((activity) => !pinnedIds.includes(activity.id)),
  ]
  const more = Math.min(POPULAR_MORE, ordered.length - shown.length)

  // The new tags take the focus, so a keyboard user carries on where they appear.
  const showMore = () => {
    const firstNew = shown.length
    // A pinned tag already on show takes no place in the next batch.
    const shownFromBatch = ordered.slice(shownCount, shownCount + POPULAR_MORE)
    const skipped = shownFromBatch.filter((activity) => pinnedIds.includes(activity.id)).length
    setShownCount((count) => count + POPULAR_MORE + skipped)
    requestAnimationFrame(() => {
      listRef.current?.querySelectorAll("button")[firstNew]?.focus()
    })
  }

  if (activities.length === 0) return null

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3"
    >
      <h2
        id={headingId}
        className="typo-label-lg text-foreground"
      >
        {t("onboarding.activities.quickPickTitle")}
      </h2>
      <div
        ref={listRef}
        className="flex flex-wrap gap-2"
      >
        {shown.map((activity) => {
          const isChosen = chosenIds.includes(activity.id)
          return (
            <FilterChip
              key={activity.id}
              pressed={isChosen}
              onPressedChange={() => onToggle(activity.id)}
              // The token sits close to the chip's left edge.
              className={cn("pl-1", isChosen && "typo-label")}
            >
              {/* Chosen: the token fills purple, as in the activity select. */}
              {isActivityKey(activity.icon) ? (
                <ActivityToken
                  activity={activity.icon}
                  isSelected={isChosen}
                  className={cn(
                    "size-7 [&_svg]:size-4",
                    isChosen && "bg-primary text-primary-foreground",
                  )}
                />
              ) : null}
              {activityLabel(activity)}
              {isChosen ? (
                <CheckIcon
                  aria-hidden
                  className="size-4 text-primary"
                />
              ) : null}
            </FilterChip>
          )
        })}
      </div>
      {more > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={showMore}
        >
          {t("onboarding.activities.loadMore", { more })}
        </Button>
      ) : null}
    </section>
  )
}
