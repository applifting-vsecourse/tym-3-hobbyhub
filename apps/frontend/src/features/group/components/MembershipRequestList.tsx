import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { JoinRequestCard } from "@/components/hobbyhub/JoinRequestCard"

import { MembershipRefusedError } from "@/features/group/api/membershipRequestMutations"
import type { PendingMembershipRequest } from "@/features/group/api/membershipRequestSchemas"
import { RejectMembershipRequestSheet } from "@/features/group/components/RejectMembershipRequestSheet"
import { useDecideMembershipRequest } from "@/features/group/hooks/useMembershipRequestMutations"

type MembershipRequestListProps = {
  groupId: string
  requests: PendingMembershipRequest[]
  /** Members now, so each card says how many there will be after approval. */
  memberCount: number
}

/** The requests waiting on a group, for its admins to approve or reject (F-07.3). */
export function MembershipRequestList({
  groupId,
  requests,
  memberCount,
}: MembershipRequestListProps) {
  const { t } = useTranslation()
  const decide = useDecideMembershipRequest()
  const [rejecting, setRejecting] = useState<PendingMembershipRequest | null>(null)

  // A refusal says what changed meanwhile; anything else is a plain failure.
  const reportFailure = (error: unknown) => {
    const refusal =
      error instanceof MembershipRefusedError
        ? error.violations.find(
            (violation) =>
              violation === "GROUP_CANCELLED" ||
              violation === "NOT_PENDING" ||
              violation === "APPLICANT_IS_MEMBER",
          )
        : undefined
    toast.error(refusal ? t(`groups.manage.refused.${refusal}`) : t("groups.manage.decideFailed"))
  }

  const approve = async (request: PendingMembershipRequest) => {
    try {
      await decide.mutateAsync({ groupId, requestId: request.id, decision: "approve" })
      toast.success(t("groups.manage.approved", { name: request.applicant.name }))
    } catch (error) {
      reportFailure(error)
    }
  }

  const reject = async (request: PendingMembershipRequest, reason: string | undefined) => {
    try {
      await decide.mutateAsync({ groupId, requestId: request.id, decision: "reject", reason })
      setRejecting(null)
      toast.success(t("groups.manage.rejected"))
    } catch (error) {
      // A refusal means the request is gone from the list, so the sheet goes
      // too; after any other failure it stays, with the reason, to try again.
      if (error instanceof MembershipRefusedError) setRejecting(null)
      reportFailure(error)
    }
  }

  if (requests.length === 0) {
    return <p className="typo-body text-muted-foreground">{t("groups.manage.requestsEmpty")}</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {requests.map((request) => (
          <li key={request.id}>
            <JoinRequestCard
              name={request.applicant.name}
              photo={request.applicant.image}
              hasVerifiedEmail={request.applicant.hasVerifiedEmail}
              bio={request.applicant.bio}
              message={request.message}
              outcome={t("groups.manage.outcome", { count: memberCount + 1 })}
              onApprove={() => void approve(request)}
              onReject={() => setRejecting(request)}
              isPending={decide.isPending}
            />
          </li>
        ))}
      </ul>
      <RejectMembershipRequestSheet
        request={rejecting}
        isPending={decide.isPending}
        onClose={() => setRejecting(null)}
        onReject={reject}
      />
    </>
  )
}
