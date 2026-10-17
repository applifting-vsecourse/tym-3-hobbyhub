import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Header } from "@/components/Header/Header"
import { Button } from "@/components/ui/button"

type AuthLayoutProps = {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
  /** Where the back button on phones leads; without it there is none. */
  backTo?: string
}

/**
 * Sign-in / sign-up pages keep the app chrome — they are pages of this app,
 * not a separate island. No card: the form sits on the page like any content.
 * The header omits the auth menu here; offering "Sign in" on the sign-in page
 * would be noise.
 */
export function AuthLayout({ title, description, children, footer, backTo }: AuthLayoutProps) {
  const { t } = useTranslation()

  return (
    <>
      <Header userMenu={null} />
      <main className="min-h-svh">
        <section className="mx-auto w-full max-w-sm px-4 py-6 md:py-16">
          {backTo ? (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="mb-4 rounded-full md:hidden"
            >
              <Link
                to={backTo}
                aria-label={t("auth.back")}
              >
                <ChevronLeft aria-hidden />
              </Link>
            </Button>
          ) : null}
          <h1 className="typo-h1 text-foreground">{title}</h1>
          <p className="mt-2 typo-body text-muted-foreground">{description}</p>

          <div className="mt-6 md:mt-8">{children}</div>

          <p className="mt-6 text-center typo-small text-muted-foreground">{footer}</p>
        </section>
      </main>
    </>
  )
}
