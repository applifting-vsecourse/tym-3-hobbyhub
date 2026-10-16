import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ShowcaseSectionProps = {
  id: string
  title: string
  description?: string
  children: ReactNode
}

/** One block of the design-system page: heading, one-line purpose, examples. */
export function ShowcaseSection({ id, title, description, children }: ShowcaseSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-20 flex-col gap-6 border-t border-border pt-8"
    >
      <div className="flex flex-col gap-2">
        <h2
          id={`${id}-title`}
          className="typo-h2 text-foreground"
        >
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl typo-body text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

type ExampleProps = {
  label: string
  children: ReactNode
  className?: string
}

/** A labelled group of examples inside a section. */
export function Example({ label, children, className }: ExampleProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="typo-label text-muted-foreground">{label}</p>
      <div className={cn("flex flex-wrap items-start gap-4", className)}>{children}</div>
    </div>
  )
}
