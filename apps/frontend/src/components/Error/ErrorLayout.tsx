import type { ReactNode } from "react"

type ErrorLayoutProps = {
  title: string
  description?: ReactNode
  action?: ReactNode
}

// Content only, no `<main>`: a 404 sits inside the AppShell's `<main>`, under
// the header and navigation. A page that has no shell supplies its own.
export function ErrorLayout({ title, description, action }: ErrorLayoutProps) {
  return (
    <section className="grid place-content-center px-6 py-24 text-center">
      <h1 className="typo-h1 text-foreground">{title}</h1>
      {description ? <p className="mt-3 typo-body text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  )
}
