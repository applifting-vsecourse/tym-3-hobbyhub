import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useLocation } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { activityName } from "@/features/activity/activityName"
import { AppShell } from "@/features/auth/components/AppShell"
import { useSession } from "@/features/auth/hooks/useSession"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"
import { groupQueryOptions } from "@/features/group/api/groupQueryOptions"
import {
  groupMembersQueryOptions,
  pendingMembershipRequestsQueryOptions,
} from "@/features/group/api/membershipRequestQueryOptions"
import { GroupAdminPanel } from "@/features/group/components/GroupAdminPanel"
import { GroupDetail } from "@/features/group/components/GroupDetail"
import { GroupMembershipPanel } from "@/features/group/components/GroupMembershipPanel"
import { GroupMembersPreview } from "@/features/group/components/GroupMembersPreview"
import {
  MembershipRequestSheet,
  type MembershipSheetStep,
} from "@/features/group/components/MembershipRequestSheet"
import { useGroupMembershipState } from "@/features/group/hooks/useGroupMembershipState"

export const Route = createFileRoute("/groups/$groupId")({
  component: GroupDetailPage,
})

// Public detail (F-02.5): outside the protected pages, so a visitor can open it
// from an event. A signed-in user asks to join right here (F-07.3), and the
// group's admins see the requests and members.
function GroupDetailPage() {
  const { groupId } = Route.useParams()
  const { t } = useTranslation()
  const location = useLocation()
  const { user, isPending: isSessionPending } = useSession()
  const membership = useGroupMembershipState(groupId, {
    userId: user?.id ?? null,
    isPending: isSessionPending,
  })
  const groupQuery = useQuery(groupQueryOptions(groupId))
  const requestsQuery = useQuery({
    ...pendingMembershipRequestsQueryOptions(groupId),
    enabled: membership.isAdmin,
  })
  const membersQuery = useQuery({
    ...groupMembersQueryOptions(groupId),
    enabled: membership.isAdmin,
  })
  // The sheet lives here, not in the panel: sending a request swaps the button
  // for the pending request, and the sheet has to survive that.
  const [sheetStep, setSheetStep] = useState<MembershipSheetStep | null>(null)

  if (
    groupQuery.isError &&
    groupQuery.error instanceof HTTPError &&
    groupQuery.error.response.status === 404
  ) {
    return (
      <>
        <Seo title={t("groups.detail.title")} />
        <AppShell>
          <NotFound />
        </AppShell>
      </>
    )
  }

  return (
    <>
      <Seo title={groupQuery.data?.name ?? t("groups.detail.title")} />
      <AppShell className="mx-auto w-full max-w-4xl px-4 py-6 md:py-12">
        {user ? (
          <BackLink
            to={ROUTES.groups}
            label={t("groups.back")}
          />
        ) : (
          <BackLink
            to={ROUTES.events}
            label={t("groups.detail.backToEvents")}
          />
        )}
        {groupQuery.isPending ? (
          <div className="flex justify-center py-16">
            <Loader
              variant="player"
              label={t("groups.detail.loading")}
            />
          </div>
        ) : groupQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("groups.detail.loadError")}</AlertTitle>
            <AlertDescription className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void groupQuery.refetch()}
              >
                {t("groups.form.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <GroupDetail
            group={groupQuery.data}
            activityLabel={activityName(t, groupQuery.data.activity)}
            membershipPanel={
              <GroupMembershipPanel
                membership={membership}
                groupName={groupQuery.data.name}
                from={encodeRedirectUri(location)}
                onRequest={() => setSheetStep("form")}
                onWithdraw={() => setSheetStep("withdraw")}
              />
            }
            adminPanel={
              membership.isAdmin ? (
                <GroupAdminPanel
                  groupId={groupId}
                  pendingCount={requestsQuery.data?.length}
                />
              ) : undefined
            }
            membersPreview={
              membership.isAdmin && membersQuery.data ? (
                <GroupMembersPreview
                  groupId={groupId}
                  members={membersQuery.data}
                />
              ) : undefined
            }
          />
        )}
        {user ? (
          <MembershipRequestSheet
            groupId={groupId}
            applicant={{ name: user.name, isEmailVerified: user.emailVerified }}
            step={sheetStep}
            onStepChange={setSheetStep}
          />
        ) : null}
      </AppShell>
    </>
  )
}
