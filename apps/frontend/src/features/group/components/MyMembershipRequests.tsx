import { useState, type ReactNode } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { Trans, useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Loader } from "@/components/hobbyhub/Loader"
import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { StatusBadge, type Status } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"

import { myMembershipRequestsQueryOptions } from "@/features/group/api/membershipRequestQueryOptions"
import type {
  MyMembershipRequest,
  MyMembershipRequestSection,
} from "@/features/group/api/membershipRequestSchemas"
import { GroupGrid } from "@/features/group/components/GroupGrid"
import { useWithdrawMembershipRequest } from "@/features/group/hooks/useMembershipRequestMutations"

const BADGES: Record<MyMembershipRequest["status"], Status> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  WITHDRAWN: "neutral",
  CLOSED: "neutral",
  GROUP_CANCELLED: "neutral",
}

const linkClassName = "text-primary underline-offset-4 hover:underline"

function useSectionQuery(userId: string, section: MyMembershipRequestSection) {
  return useInfiniteQuery(myMembershipRequestsQueryOptions(userId, section))
}

type SectionQuery = ReturnType<typeof useSectionQuery>

/**
 * "Žádosti" tab (F-07.7): the viewer's requests to join groups in two
 * sections, "Čekající" and "Historie", each newest first. Approved requests
 * are in neither: "Moje skupiny" shows them as memberships.
 */
export function MyMembershipRequests({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const pending = useSectionQuery(userId, "pending")
  const history = useSectionQuery(userId, "history")
  const withdraw = useWithdrawMembershipRequest()
  const [withdrawing, setWithdrawing] = useState<MyMembershipRequest | null>(null)

  const confirmWithdraw = async (groupId: string) => {
    try {
      await withdraw.mutateAsync(groupId)
      setWithdrawing(null)
      toast.success(t("groups.membershipRequest.withdraw.done"))
    } catch {
      toast.error(t("groups.membershipRequest.withdraw.failed"))
    }
  }

  // One loader for the tab, not one per section.
  if (pending.isPending || history.isPending) {
    return (
      <div className="flex justify-center py-8">
        <Loader
          variant="player"
          label={t("groups.myRequests.loading")}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <RequestSection
        section="pending"
        query={pending}
        empty={
          <Trans
            i18nKey="groups.myRequests.pendingEmpty"
            components={{
              discover: (
                <Link
                  to="/groups"
                  search={{ tab: "discover" }}
                  className={linkClassName}
                />
              ),
            }}
          />
        }
        onWithdraw={(request) => {
          withdraw.reset()
          setWithdrawing(request)
        }}
      />
      <RequestSection
        section="history"
        query={history}
        empty={t("groups.myRequests.historyEmpty")}
      />
      <ResponsiveSheet
        isOpen={withdrawing !== null}
        onOpenChange={(isOpening) => {
          if (!isOpening) setWithdrawing(null)
        }}
        title={t("groups.membershipRequest.withdraw.title")}
        hasCloseButton
        footer={
          <>
            <Button onClick={() => setWithdrawing(null)}>
              {t("groups.membershipRequest.withdraw.keep")}
            </Button>
            <Button
              variant="outline"
              disabled={withdraw.isPending}
              onClick={() => {
                if (withdrawing) void confirmWithdraw(withdrawing.group.id)
              }}
            >
              {withdraw.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("groups.membershipRequest.withdraw.confirm")}
            </Button>
          </>
        }
      >
        <p className="mb-1 rounded-lg bg-muted p-4 typo-body text-foreground">
          {t("groups.membershipRequest.withdraw.text")}
        </p>
      </ResponsiveSheet>
    </div>
  )
}

type RequestSectionProps = {
  section: MyMembershipRequestSection
  query: SectionQuery
  /** One sentence saying what would appear here. */
  empty: ReactNode
  /** Only the waiting requests can be withdrawn. */
  onWithdraw?: (request: MyMembershipRequest) => void
}

/** A titled list of requests, a page at a time, with its empty and error states. */
function RequestSection({ section, query, empty, onWithdraw }: RequestSectionProps) {
  const { t } = useTranslation()
  const requests = query.data?.pages.flatMap((page) => page.items)
  const headingId = `my-requests-${section}-heading`

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
    >
      <h2
        id={headingId}
        className="typo-h3 text-foreground"
      >
        {t(`groups.myRequests.${section}Title`)}
      </h2>
      <GroupGrid
        items={requests}
        isPending={false}
        // A failed next page keeps the loaded ones; the button below retries it.
        error={requests ? null : query.error}
        onRetry={() => void query.refetch()}
        getKey={(request) => request.id}
        listClassName="flex flex-col gap-3"
        errorTitle={t("groups.myRequests.loadError")}
        renderItem={(request) => (
          <MyMembershipRequestCard
            request={request}
            // Every waiting request is waiting; the section title says so.
            hasStatus={section === "history"}
            onWithdraw={onWithdraw ? () => onWithdraw(request) : undefined}
          />
        )}
        empty={empty}
      />
      {query.hasNextPage ? (
        <div className="flex flex-col items-center gap-2">
          {query.isFetchNextPageError ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("groups.myRequests.loadMoreError")}
            </p>
          ) : null}
          <Button
            variant="outline"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? t("groups.list.loadingMore") : t("groups.list.loadMore")}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

type MyMembershipRequestCardProps = {
  request: MyMembershipRequest
  hasStatus: boolean
  onWithdraw?: () => void
}

/**
 * One request as its applicant sees it: where, how it stands, and when. A
 * withdrawn one is told apart by its badge alone, at full contrast, and the
 * group stays a link, because a new request starts there.
 */
function MyMembershipRequestCard({ request, hasStatus, onWithdraw }: MyMembershipRequestCardProps) {
  const { t, i18n } = useTranslation()
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" })
  const { status, group } = request

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="typo-title break-words text-foreground">
          {group.isOpen ? (
            <Link
              to="/groups/$groupId"
              params={{ groupId: group.id }}
              className={linkClassName}
            >
              {group.name}
            </Link>
          ) : (
            group.name
          )}
        </h3>
        {hasStatus ? (
          <StatusBadge status={BADGES[status]}>
            {status === "PENDING" || status === "REJECTED"
              ? undefined
              : t(`groups.myRequests.status.${status}`)}
          </StatusBadge>
        ) : null}
      </div>
      <p className="typo-small text-muted-foreground">
        {t("groups.myRequests.requestedAt", { date: date.format(request.requestedAt) })}
        {request.decidedAt && status !== "PENDING" && status !== "GROUP_CANCELLED"
          ? ` · ${t(`groups.myRequests.decidedAt.${status}`, {
              date: date.format(request.decidedAt),
            })}`
          : null}
      </p>
      {status === "GROUP_CANCELLED" ? (
        <p className="typo-small text-muted-foreground">
          {t("groups.myRequests.groupCancelledText")}
        </p>
      ) : null}
      {request.decisionMessage || request.message ? (
        <dl className="flex flex-col gap-3">
          {request.decisionMessage ? (
            <div className="flex flex-col gap-1">
              <dt className="typo-label text-muted-foreground">
                {t("groups.myRequests.decisionMessage")}
              </dt>
              <dd className="typo-body break-words whitespace-pre-line text-foreground">
                {request.decisionMessage}
              </dd>
            </div>
          ) : null}
          {request.message ? (
            <div className="flex flex-col gap-1">
              <dt className="typo-label text-muted-foreground">{t("groups.myRequests.message")}</dt>
              <dd className="typo-body break-words whitespace-pre-line text-foreground">
                {request.message}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {status === "PENDING" && onWithdraw ? (
        <Button
          variant="outline"
          className="self-start"
          onClick={onWithdraw}
        >
          {t("groups.membershipRequest.sent.withdraw")}
        </Button>
      ) : null}
    </article>
  )
}
