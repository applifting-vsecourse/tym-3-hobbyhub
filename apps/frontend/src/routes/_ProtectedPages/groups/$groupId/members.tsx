import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { BackLink } from "@/components/BackLink"
import { NotFound } from "@/components/Error/NotFound"
import { Loader } from "@/components/hobbyhub/Loader"
import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"

import { useSession } from "@/features/auth/hooks/useSession"
import { groupMembershipQueryOptions } from "@/features/group/api/groupMembershipQueryOptions"
import { groupQueryOptions } from "@/features/group/api/groupQueryOptions"
import { hasGroupAdminRights } from "@/features/group/api/groupSchemas"
import {
  groupMembersQueryOptions,
  pendingMembershipRequestsQueryOptions,
} from "@/features/group/api/membershipRequestQueryOptions"
import { GroupManageTabs } from "@/features/group/components/GroupManageTabs"
import { GroupMemberList } from "@/features/group/components/GroupMemberList"
import { MembershipRequestList } from "@/features/group/components/MembershipRequestList"

const membersSearchSchema = z.object({
  // "Členové" is the default and has no param; anything unknown falls back to it.
  tab: z.enum(["requests"]).optional().catch(undefined),
})

export const Route = createFileRoute("/_ProtectedPages/groups/$groupId/members")({
  validateSearch: membersSearchSchema,
  component: GroupMembersPage,
})

const isNotFound = (error: unknown) => error instanceof HTTPError && error.response.status === 404

// Správa členů (F-07.3, wireframe 32): the members and the waiting requests
// for the group's admins, with what they may do to each member (F-07.3b). A
// plain member sees the members only, without the requests or any menu.
function GroupMembersPage() {
  const { groupId } = Route.useParams()
  const search = Route.useSearch()
  const { t } = useTranslation()
  const { user } = useSession()
  const groupQuery = useQuery(groupQueryOptions(groupId))
  const membershipQuery = useQuery(groupMembershipQueryOptions(groupId))
  const role = membershipQuery.data?.role ?? null
  const isAdmin = hasGroupAdminRights(role)
  // To anyone outside the group the members answer 404, and the requests to
  // anyone but its admins: then the page does not exist for them either.
  const membersQuery = useQuery(groupMembersQueryOptions(groupId))
  const requestsQuery = useQuery({
    ...pendingMembershipRequestsQueryOptions(groupId),
    enabled: isAdmin,
  })
  // A member who follows a link to the requests lands on the members.
  const tab = isAdmin ? (search.tab ?? "members") : "members"

  if (
    isNotFound(groupQuery.error) ||
    isNotFound(membersQuery.error) ||
    isNotFound(requestsQuery.error)
  ) {
    return (
      <>
        <Seo title={t("groups.manage.title")} />
        <NotFound />
      </>
    )
  }

  const shown = tab === "requests" ? requestsQuery : membersQuery
  // Until the role is known, a link to the requests waits rather than
  // flashing the members.
  const isPending =
    groupQuery.isPending ||
    shown.isPending ||
    (search.tab === "requests" && membershipQuery.isPending)
  const me = user && role ? { userId: user.id, role } : undefined
  const isError = groupQuery.isError || shown.isError

  return (
    <>
      <Seo title={groupQuery.data?.name ?? t("groups.manage.title")} />
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:py-12">
        <div className="flex flex-col gap-4">
          <BackLink
            to="/groups/$groupId"
            params={{ groupId }}
            label={t("groups.manage.back")}
          />
          <h1 className="typo-h1 text-foreground">
            {groupQuery.data?.name ?? t("groups.manage.title")}
          </h1>
          {isAdmin ? (
            <GroupManageTabs
              groupId={groupId}
              active={tab}
              counts={{
                members: membersQuery.data?.length,
                requests: requestsQuery.data?.length,
              }}
            />
          ) : (
            <h2 className="typo-h3 text-foreground">
              {t("groups.manage.membersTitle", { count: membersQuery.data?.length ?? 0 })}
            </h2>
          )}
        </div>

        {isPending ? (
          <div className="flex justify-center py-8">
            <Loader
              variant="player"
              label={t("groups.manage.loading")}
            />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("groups.manage.loadError")}</AlertTitle>
            <AlertDescription className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void groupQuery.refetch()
                  void shown.refetch()
                }}
              >
                {t("groups.manage.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : tab === "requests" ? (
          <MembershipRequestList
            groupId={groupId}
            requests={requestsQuery.data ?? []}
            memberCount={membersQuery.data?.length ?? groupQuery.data?.memberCount ?? 0}
          />
        ) : (
          <GroupMemberList
            groupId={groupId}
            groupName={groupQuery.data?.name ?? ""}
            members={membersQuery.data ?? []}
            me={me}
          />
        )}
      </section>
    </>
  )
}
