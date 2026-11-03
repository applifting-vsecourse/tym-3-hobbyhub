import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { onboardingQueryOptions } from "@/features/onboarding/api/onboardingQueryOptions"

/**
 * Asks to finish the profile after the onboarding was skipped, or left
 * half-way, until it is finished (F-04.8). Says nothing while loading or when
 * the question does not apply.
 */
export function ProfilePrompt() {
  const { t } = useTranslation()
  const { data } = useQuery(onboardingQueryOptions())

  if (!data) return null
  const isSkipped = data.completedAt !== null && data.skipped
  const isInProgress = data.completedAt === null
  if (!isSkipped && !isInProgress) return null

  return (
    <Alert>
      <AlertTitle>{t("onboarding.prompt.title")}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{t("onboarding.prompt.description")}</span>
        <Button
          asChild
          className="self-start"
        >
          <Link to={ROUTES.onboarding}>{t("onboarding.prompt.action")}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
