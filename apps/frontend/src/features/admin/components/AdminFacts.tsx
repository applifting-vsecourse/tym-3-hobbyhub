import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

/** #238: a section of a detail in the administration; no card, a heading. */
export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="typo-h3 text-foreground">{title}</h2>
      {children}
    </section>
  )
}

/** Label–value pairs; an empty value says so instead of leaving a gap. */
export function AdminFacts({ facts }: { facts: { label: string; value: ReactNode }[] }) {
  const { t } = useTranslation()
  return (
    <dl className="grid gap-x-6 gap-y-2 typo-body sm:grid-cols-[minmax(10rem,auto)_1fr]">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="contents"
        >
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="min-w-0 break-words text-foreground max-sm:mb-2">
            {fact.value ?? t("admin.none")}
          </dd>
        </div>
      ))}
    </dl>
  )
}
