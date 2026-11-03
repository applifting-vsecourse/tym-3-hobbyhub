import { isActivityKey } from "@/components/hobbyhub/ActivityIcon"
import { ActivityToken } from "@/components/hobbyhub/ActivityToken"

type ActivityChipProps = {
  icon: string
  name: string
  /** How well the person plays it, if they said. */
  level?: string | null
}

/** A sport I play: its token, the name and, below it, my level. */
export function ActivityChip({ icon, name, level }: ActivityChipProps) {
  return (
    <li className="flex items-center gap-2 rounded-full bg-accent py-0.5 pr-4 pl-0.5 text-accent-foreground">
      {isActivityKey(icon) ? (
        <ActivityToken
          activity={icon}
          isSelected
        />
      ) : null}
      <span className="flex flex-col">
        <span className="typo-label">{name}</span>
        {level ? <span className="typo-caption opacity-80">{level}</span> : null}
      </span>
    </li>
  )
}
