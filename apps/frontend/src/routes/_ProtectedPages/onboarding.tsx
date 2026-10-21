import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import { redirectTarget } from "@/features/auth/lib/redirect"
import { onboardingQueryOptions } from "@/features/onboarding/api/onboardingQueryOptions"
import { OnboardingWizard } from "@/features/onboarding/components/OnboardingWizard"

// `from` is the page to return to afterwards, e.g. the event the visitor
// wanted to join (F-04.8). It travels through the sign-up.
const onboardingSearchParamsSchema = z.object({
  from: z.string().optional(),
})

export const Route = createFileRoute("/_ProtectedPages/onboarding")({
  component: OnboardingPage,
  validateSearch: onboardingSearchParamsSchema,
  loader: async ({ context }) => {
    // Always asked afresh: what the cache holds may be another person's.
    const onboarding = await context.queryClient.fetchQuery({
      ...onboardingQueryOptions(),
      staleTime: 0,
    })
    // Done for good. A skipped one stays open for the profile's prompt.
    if (onboarding.completedAt && !onboarding.skipped) throw redirect({ to: ROUTES.events })
  },
})

function OnboardingPage() {
  const { from } = Route.useSearch()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activities = useQuery(activitiesQueryOptions())
  // Where to go afterwards: the page the visitor came from, if it is one of ours.
  const target = redirectTarget(from, ROUTES.events)
  // A stable function, so the picker's list of options is not rebuilt on every render.
  const activityLabel = useCallback(
    (activity: { name: string; icon: string }) => activityName(t, activity),
    [t],
  )

  return (
    <>
      <Seo title={t("onboarding.seoTitle")} />
      <section className="mx-auto w-full max-w-xl px-4 py-6 md:py-12">
        <OnboardingWizard
          activities={activities.data ?? []}
          isLoadingActivities={activities.isPending}
          activitiesError={activities.error}
          onReloadActivities={() => void activities.refetch()}
          activityLabel={activityLabel}
          isReturningToEvent={target !== ROUTES.events}
          onLeave={() => navigate({ to: target })}
        />
      </section>
    </>
  )
}
