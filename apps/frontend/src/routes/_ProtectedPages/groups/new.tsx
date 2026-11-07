import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { Seo } from "@/components/Seo"
import { EmailNotVerifiedError } from "@/lib/emailNotVerified"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import { VerifyEmailSheet } from "@/features/auth/components/VerifyEmailSheet"
import type { CreateGroupInput } from "@/features/group/api/groupSchemas"
import { GroupForm } from "@/features/group/components/GroupForm"
import { useCreateGroup } from "@/features/group/hooks/useCreateGroup"

export const Route = createFileRoute("/_ProtectedPages/groups/new")({
  component: NewGroupPage,
})

function NewGroupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const activitiesQuery = useQuery(activitiesQueryOptions())
  const createGroup = useCreateGroup()
  const [isVerifySheetOpen, setIsVerifySheetOpen] = useState(false)
  const activityOptions = useMemo(
    () =>
      (activitiesQuery.data ?? []).map((activity) => ({
        id: activity.id,
        label: activityName(t, activity),
        icon: activity.icon,
      })),
    [activitiesQuery.data, t],
  )

  // A failed save throws on purpose: the form then keeps guarding the typed
  // values, and the message comes from the mutation state below.
  const handleSubmit = async (values: CreateGroupInput) => {
    let group
    try {
      group = await createGroup.mutateAsync(values)
    } catch (error) {
      // F-03.2: not an error of the form but a missing step, which the sheet explains.
      if (error instanceof EmailNotVerifiedError) setIsVerifySheetOpen(true)
      throw error
    }
    toast.success(t("groups.form.created"))
    await navigate({ to: "/groups/$groupId", params: { groupId: group.id } })
  }

  return (
    <>
      <Seo title={t("groups.form.title")} />
      <section className="mx-auto w-full max-w-2xl px-4 py-6 md:py-12">
        <BackLink
          to={ROUTES.groups}
          label={t("groups.back")}
        />
        <h1 className="typo-h1 text-foreground">{t("groups.form.title")}</h1>
        <VerifyEmailSheet
          isOpen={isVerifySheetOpen}
          onOpenChange={setIsVerifySheetOpen}
        />
        <div className="mt-6 md:mt-8">
          <GroupForm
            activities={activityOptions}
            isActivitiesLoading={activitiesQuery.isPending}
            isActivitiesError={activitiesQuery.isError}
            onRetryActivities={() => void activitiesQuery.refetch()}
            isSubmitting={createGroup.isPending}
            errorMessage={
              createGroup.isError && !(createGroup.error instanceof EmailNotVerifiedError)
                ? t("groups.form.createFailed")
                : null
            }
            onSubmit={handleSubmit}
          />
        </div>
      </section>
    </>
  )
}
