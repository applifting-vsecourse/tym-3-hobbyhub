import { useId, type ReactNode } from "react"

type ProfileSectionProps = {
  title: string
  description?: string
  children: ReactNode
}

/** One block of the profile page: a heading, a note and the fields, set apart by a hairline. */
export function ProfileSection({ title, description, children }: ProfileSectionProps) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 border-t border-border pt-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2
            id={headingId}
            className="typo-h3 text-foreground"
          >
            {title}
          </h2>
          {description ? <p className="typo-small text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}
