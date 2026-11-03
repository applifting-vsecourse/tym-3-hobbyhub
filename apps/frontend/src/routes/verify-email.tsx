import type { CSSProperties } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppShell } from "@/app/AppShell"
import { ROUTES } from "@/app/routes"
import { ActivityAvatar } from "@/components/hobbyhub/ActivityAvatar"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { ResendVerification } from "@/features/auth/components/ResendVerification"
import { redirectTarget } from "@/features/auth/lib/redirect"
import { currentPath } from "@/features/auth/lib/verifyEmailUrl"

// F-03.2. The link in the verification e-mail ends here. BetterAuth adds
// `error` when the link did not work; `next` is the page the person came from.
const verifyEmailSearchSchema = z.object({
  next: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  validateSearch: verifyEmailSearchSchema,
  // The link was just opened, so whatever the session said before is out of date.
  loader: ({ context }) =>
    context.queryClient.fetchQuery({ ...authSessionQueryOptions(), staleTime: 0 }),
})

const BADGE = { done: "approved", already: "approved", failed: "rejected" } as const

function VerifyEmailPage() {
  const { t } = useTranslation()
  const { next, error } = Route.useSearch()
  // The loader fetched it afresh; the query then keeps it current, so verifying
  // in another tab clears the failure here too.
  const { data: session } = useQuery({
    ...authSessionQueryOptions(),
    initialData: Route.useLoaderData(),
  })
  // `next` is already decoded once by the router; the helper decodes `from`.
  const target = redirectTarget(
    next === undefined ? undefined : encodeURIComponent(next),
    ROUTES.home,
  )
  const isVerified = session?.user.emailVerified === true

  // A used link on an e-mail that is verified by now is no failure.
  // Without `error` the link worked, unless this very person is signed in and
  // still unverified: then the page was opened by hand, or with another person's link.
  const outcome = error
    ? isVerified
      ? "already"
      : "failed"
    : session && !isVerified
      ? "failed"
      : "done"

  return (
    <>
      <Seo title={t(`auth.verifyEmail.${outcome}.title`)} />
      <AppShell className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-12 text-center md:py-24">
        {/* The seat is yours: a person where there was a dashed empty place. */}
        <div className="flex enter flex-col items-center gap-4">
          <ActivityAvatar
            avatar={outcome === "failed" ? "free" : "turistka"}
            size="2xl"
          />
          <StatusBadge status={BADGE[outcome]}>
            {t(`auth.verifyEmail.${outcome}.badge`)}
          </StatusBadge>
        </div>
        <div
          className="flex enter flex-col items-center gap-3"
          style={{ "--enter-index": 1 } as CSSProperties}
        >
          <h1 className="typo-h1 text-balance text-foreground">
            {t(`auth.verifyEmail.${outcome}.title`)}
          </h1>
          <p className="typo-body-lg text-balance text-muted-foreground">
            {t(`auth.verifyEmail.${outcome}.description`)}
          </p>
        </div>
        <div
          className="flex w-full enter justify-center *:max-sm:w-full"
          style={{ "--enter-index": 2 } as CSSProperties}
        >
          {outcome === "failed" ? (
            session ? (
              <ResendVerification next={target} />
            ) : (
              <Button asChild>
                <Link
                  to={ROUTES.login}
                  // Back to this very page after signing in, where resending is possible.
                  search={{ from: encodeURIComponent(currentPath()) }}
                >
                  {t("auth.verifyEmail.failed.signIn")}
                </Link>
              </Button>
            )
          ) : (
            <Button asChild>
              <Link to={target}>{t("auth.verifyEmail.continue")}</Link>
            </Button>
          )}
        </div>
      </AppShell>
    </>
  )
}
