import { useMemo, useState } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ActivityCombobox } from "@/components/hobbyhub/ActivityCombobox"
import { ActivityIcon, isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { ActivityOption, LevelOption } from "@/features/onboarding/api/onboardingSchemas"

// A Radix item needs a non-empty value; this one takes the level back.
const NO_LEVEL = "NONE"

export type PickedActivity = { activityId: string; levelId: string | null }

function ActivityName({ activity, label }: { activity: ActivityOption; label: string }) {
  return (
    <span className="flex items-center gap-2">
      {isActivityKey(activity.icon) ? (
        <ActivityIcon
          activity={activity.icon}
          className="size-5"
        />
      ) : null}
      {label}
    </span>
  )
}

type ActivityPickerProps = {
  activities: ActivityOption[]
  /** Display name of an activity; the activity feature owns the translation. */
  activityLabel: (activity: ActivityOption) => string
  /** The levels a person can name, from the catalogue, easiest first. */
  levels: LevelOption[]
  value: PickedActivity[]
  onChange: (value: PickedActivity[]) => void
}

/**
 * Two small decisions in order: add an activity with the same search-as-you-type
 * select the event form uses, then say how well you play it, if you want to.
 * Picked activities leave the first select and are listed below, one row each.
 */
export function ActivityPicker({
  activities,
  activityLabel,
  levels,
  value,
  onChange,
}: ActivityPickerProps) {
  const { t } = useTranslation()

  const options = useMemo(
    () =>
      activities
        .filter((activity) => !value.some((item) => item.activityId === activity.id))
        .map((activity) => ({
          id: activity.id,
          label: activityLabel(activity),
          icon: activity.icon,
        })),
    [activities, activityLabel, value],
  )

  // Said aloud: the select closes and nothing else tells a screen reader that
  // the activity was added.
  const [announcement, setAnnouncement] = useState("")
  const add = (id: string) => {
    onChange([...value, { activityId: id, levelId: null }])
    const added = activities.find((activity) => activity.id === id)
    if (added) setAnnouncement(t("onboarding.activities.added", { activity: activityLabel(added) }))
  }
  const remove = (id: string) => onChange(value.filter((item) => item.activityId !== id))
  const setLevel = (id: string, levelId: string | null) =>
    onChange(value.map((item) => (item.activityId === id ? { ...item, levelId } : item)))

  const picked = value.flatMap((item) => {
    const activity = activities.find((candidate) => candidate.id === item.activityId)
    return activity ? [{ activity, levelId: item.levelId }] : []
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="activity-add"
          className="typo-label-lg text-foreground"
        >
          {t("onboarding.activities.addLabel")}
        </label>
        <ActivityCombobox
          id="activity-add"
          options={options}
          // Always empty: choosing an option adds it to the list below.
          value=""
          onValueChange={add}
          placeholder={t("onboarding.activities.addPlaceholder")}
          disabled={options.length === 0}
        />
        {options.length === 0 ? (
          <p className="typo-small text-muted-foreground">{t("onboarding.activities.allPicked")}</p>
        ) : null}
      </div>

      <p
        role="status"
        className="sr-only"
      >
        {announcement}
      </p>

      {picked.length > 0 ? (
        <section
          aria-labelledby="picked-activities"
          className="flex flex-col gap-3"
        >
          <h2
            id="picked-activities"
            className="typo-label-lg text-foreground"
          >
            {t("onboarding.activities.pickedTitle")}
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {picked.map(({ activity, levelId }) => {
              const name = activityLabel(activity)
              return (
                <li
                  key={activity.id}
                  className="flex items-center gap-2 py-2 first:pt-0"
                >
                  <p
                    id={`level-${activity.id}`}
                    className="min-w-0 flex-1 typo-label text-foreground"
                  >
                    <ActivityName
                      activity={activity}
                      label={name}
                    />
                  </p>
                  <Select
                    // "" shows the placeholder: no level is not a value to read.
                    value={levelId ?? ""}
                    onValueChange={(next) => setLevel(activity.id, next === NO_LEVEL ? null : next)}
                  >
                    <SelectTrigger
                      aria-labelledby={`level-${activity.id}`}
                      className="w-44 shrink-0"
                    >
                      <SelectValue placeholder={t("onboarding.activities.levelPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem
                          key={level.id}
                          value={level.id}
                        >
                          {level.name}
                        </SelectItem>
                      ))}
                      {levelId ? (
                        <SelectItem value={NO_LEVEL}>{t("onboarding.levels.NONE")}</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="max-md:size-11"
                    aria-label={t("onboarding.activities.remove", { activity: name })}
                    onClick={() => remove(activity.id)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
