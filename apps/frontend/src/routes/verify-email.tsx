import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"
import { Button } from "@/components/ui/button"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { AppShell } from "@/features/auth/components/AppShell"
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

function VerifyEmailPage() {
  const { t } = useTranslation()
  const { next, error } = Route.useSearch()
  const session = Route.useLoaderData()
  const target = redirectTarget(next, ROUTES.home)
  const isVerified = session?.user.emailVerified === true

  // A used link on an e-mail that is verified by now is no failure.
  const outcome = !error ? "done" : isVerified ? "already" : "failed"

  return (
    <>
      <Seo title={t(`auth.verifyEmail.${outcome}.title`)} />
      <AppShell className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-4 py-6 md:py-12">
        <h1 className="typo-h1 text-foreground">{t(`auth.verifyEmail.${outcome}.title`)}</h1>
        <p className="typo-body text-muted-foreground">
          {t(`auth.verifyEmail.${outcome}.description`)}
        </p>
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
      </AppShell>
    </>
  )
}
