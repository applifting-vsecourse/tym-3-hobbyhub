import { useState } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { createFileRoute, useLocation } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppShell } from "@/app/AppShell"
import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { activityName } from "@/features/activity/activityName"
import { useSession } from "@/features/auth/hooks/useSession"
import { encodeRedirectUri } from "@/features/auth/lib/redirect"
import { groupEventsQueryOptions } from "@/features/event/api/groupEventsQueryOptions"
import { GroupEvents } from "@/features/event/components/GroupEvents"
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

const groupSearchSchema = z.object({
  // F-07.2: the upcoming events are the default and have no param; anything
  // unknown falls back to them.
  events: z.enum(["past"]).optional().catch(undefined),
})

export const Route = createFileRoute("/groups/$groupId")({
  validateSearch: groupSearchSchema,
  component: GroupDetailPage,
})

// Public detail (F-02.5): outside the protected pages, so a visitor can open it
// from an event. A signed-in user asks to join right here (F-07.3), and the
// group's members see the members and its admins the requests.
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
  // F-07.2: members also see the past; anyone else only what is coming, so a
  // link to the past from a non-member shows the upcoming events.
  const search = Route.useSearch()
  const isMember = membership.view === "member"
  const period = isMember ? (search.events ?? "upcoming") : "upcoming"
  const eventsQuery = useInfiniteQuery({
    ...groupEventsQueryOptions(groupId, period, { userId: user?.id ?? null, isMember }),
    // Who is looking decides what comes back: wait until that is known.
    enabled: membership.view !== "loading",
  })
  const groupEvents = eventsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const requestsQuery = useQuery({
    ...pendingMembershipRequestsQueryOptions(groupId),
    enabled: membership.isAdmin,
  })
  const membersQuery = useQuery({
    ...groupMembersQueryOptions(groupId),
    enabled: membership.view === "member",
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
                groupId={groupId}
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
            events={
              <GroupEvents
                groupId={groupId}
                period={period}
                isMember={isMember}
                events={groupEvents}
                total={eventsQuery.data?.pages[0]?.total ?? 0}
                activityLabel={(activity) => activityName(t, activity)}
                isLoading={eventsQuery.isPending}
                error={eventsQuery.error}
                onReload={() => void eventsQuery.refetch()}
                hasMore={eventsQuery.hasNextPage}
                isLoadingMore={eventsQuery.isFetchingNextPage}
                onLoadMore={() => void eventsQuery.fetchNextPage()}
              />
            }
            membersPreview={
              membership.view === "member" && membersQuery.data ? (
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
            // What the server says the admins will see; the session's own
            // fields stand in while it loads or when it failed.
            applicant={
              membership.applicant ?? {
                name: user.name,
                image: null,
                bio: null,
                hasVerifiedEmail: user.emailVerified,
              }
            }
            step={sheetStep}
            onStepChange={setSheetStep}
          />
        ) : null}
      </AppShell>
    </>
  )
}
