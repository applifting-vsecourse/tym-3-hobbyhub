import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/Seo"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import type { CreateGroupInput } from "@/features/group/api/groupSchemas"
import { BackLink } from "@/features/group/components/BackLink"
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
  const activityOptions = useMemo(
    () =>
      (activitiesQuery.data ?? []).map((activity) => ({
        id: activity.id,
        label: activityName(t, activity),
        icon: activity.icon,
      })),
    [activitiesQuery.data, t],
  )

  const handleSubmit = async (values: CreateGroupInput) => {
    try {
      const group = await createGroup.mutateAsync(values)
      toast.success(t("groups.form.created"))
      await navigate({ to: "/groups/$groupId", params: { groupId: group.id } })
    } catch {
      // Shown in the form from the mutation state.
    }
  }

  return (
    <>
      <Seo title={t("groups.form.title")} />
      <section className="mx-auto w-full max-w-2xl px-4 py-6 md:py-12">
        <BackLink to={ROUTES.groups} />
        <h1 className="typo-h1 text-foreground">{t("groups.form.title")}</h1>
        <div className="mt-6 md:mt-8">
          <GroupForm
            activities={activityOptions}
            isActivitiesLoading={activitiesQuery.isPending}
            isActivitiesError={activitiesQuery.isError}
            onRetryActivities={() => void activitiesQuery.refetch()}
            isSubmitting={createGroup.isPending}
            errorMessage={createGroup.isError ? t("groups.form.createFailed") : null}
            onSubmit={handleSubmit}
          />
        </div>
      </section>
    </>
  )
}
