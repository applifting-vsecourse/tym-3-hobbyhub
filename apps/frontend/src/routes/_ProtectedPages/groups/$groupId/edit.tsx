import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { BackLink } from "@/components/BackLink"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { activityName } from "@/features/activity/activityName"
import { activitiesQueryOptions } from "@/features/activity/api/activitiesQueryOptions"
import { groupKeys } from "@/features/group/api/groupKeys"
import { groupQueryOptions } from "@/features/group/api/groupQueryOptions"
import type { CreateGroupInput } from "@/features/group/api/groupSchemas"
import { updateGroup } from "@/features/group/api/updateGroup"
import { GroupForm } from "@/features/group/components/GroupForm"

export const Route = createFileRoute("/_ProtectedPages/groups/$groupId/edit")({
  component: EditGroupPage,
})

// ADR-0028: the admins change what the founder filled in. The server decides
// who may; anyone else gets "not found".
function EditGroupPage() {
  const { groupId } = Route.useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groupQuery = useQuery(groupQueryOptions(groupId))
  const activitiesQuery = useQuery(activitiesQueryOptions())
  const activityOptions = useMemo(
    () =>
      (activitiesQuery.data ?? []).map((activity) => ({
        id: activity.id,
        label: activityName(t, activity),
        icon: activity.icon,
        category: activity.category,
      })),
    [activitiesQuery.data, t],
  )
  const group = groupQuery.data

  const handleSubmit = async (values: CreateGroupInput) => {
    await updateGroup(groupId, {
      ...values,
      // An emptied place or day list is a change too, not "leave as it is".
      locationName: values.locationName ?? "",
      usualSchedule: values.usualSchedule ?? "",
      meetingDays: values.meetingDays ?? [],
      clearLocation: values.locationName === undefined,
    })
    await queryClient.invalidateQueries({ queryKey: groupKeys.all() })
    toast.success(t("groups.form.saved"))
    await navigate({ to: "/groups/$groupId", params: { groupId } })
  }

  return (
    <>
      <Seo title={t("groups.form.editTitle")} />
      <section className="mx-auto w-full max-w-2xl px-page py-6 md:py-12">
        <BackLink
          to="/groups/$groupId"
          params={{ groupId }}
          label={t("groups.back")}
        />
        <h1 className="typo-h1 text-foreground">{t("groups.form.editTitle")}</h1>
        <div className="mt-6 md:mt-8">
          {group ? (
            <GroupForm
              activities={activityOptions}
              isActivitiesLoading={activitiesQuery.isPending}
              isActivitiesError={activitiesQuery.isError}
              onRetryActivities={() => void activitiesQuery.refetch()}
              isSubmitting={false}
              submitLabel={t("groups.form.save")}
              initialValues={{
                name: group.name,
                activityId: group.activity.id,
                description: group.description,
                locationName: group.locationName ?? "",
                usualSchedule: group.usualSchedule ?? "",
                approvalMode: group.approvalMode,
                meetingDays: group.meetingDays,
                latitude: group.latitude ?? undefined,
                longitude: group.longitude ?? undefined,
              }}
              onSubmit={handleSubmit}
            />
          ) : groupQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{t("groups.detail.loadError")}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex justify-center py-8">
              <Loader label={t("groups.detail.loading")} />
            </div>
          )}
        </div>
      </section>
    </>
  )
}
