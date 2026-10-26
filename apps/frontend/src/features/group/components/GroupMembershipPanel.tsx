import { useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { StatusBadge } from "@/components/hobbyhub/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { GroupMembershipState } from "@/features/group/hooks/useGroupMembershipState"

type GroupMembershipPanelProps = {
  membership: GroupMembershipState
  groupName: string
  /** Encoded address of this page, so signing in or up returns here. */
  from: string
  /** Opens the request form, which the page owns. */
  onRequest: () => void
  /** Opens the confirmation to withdraw a pending request, which the page owns. */
  onWithdraw: () => void
}

/**
 * The one action of the group page: ask to join (F-07.3). A visitor is sent to
 * sign up and brought back here; a signed-in user asks with an optional
 * message and sees the request wait for the group's admins.
 */
export function GroupMembershipPanel({
  membership,
  groupName,
  from,
  onRequest,
  onWithdraw,
}: GroupMembershipPanelProps) {
  const { t } = useTranslation()
  const { view } = membership
  const [isLeaveOpen, setIsLeaveOpen] = useState(false)

  const confirmLeave = async () => {
    try {
      await membership.leave()
      setIsLeaveOpen(false)
    } catch {
      // The dialog stays open and shows `leaveFailed`.
    }
  }

  let content: ReactNode
  if (view === "member") {
    content = (
      <>
        <StatusBadge status="approved">{t("groups.detail.membership.isMember")}</StatusBadge>
        {membership.canLeave ? (
          <Button
            variant="outline"
            onClick={() => {
              membership.resetLeave()
              setIsLeaveOpen(true)
            }}
          >
            {t("groups.detail.membership.leave")}
          </Button>
        ) : null}
      </>
    )
  } else if (view === "pending") {
    content = (
      <>
        <StatusBadge status="pending" />
        <p className="typo-small text-muted-foreground">
          {t("groups.detail.membership.pendingText")}
        </p>
        <Button
          variant="outline"
          onClick={onWithdraw}
        >
          {t("groups.detail.membership.withdraw")}
        </Button>
      </>
    )
  } else if (view === "rejected") {
    content = (
      <>
        <StatusBadge status="rejected" />
        <p className="typo-small text-muted-foreground">
          {t("groups.detail.membership.rejectedText")}
        </p>
      </>
    )
  } else if (view === "canRequest") {
    content = (
      <>
        <Button onClick={onRequest}>{t("groups.detail.membership.request")}</Button>
        <p className="typo-small text-muted-foreground">
          {t("groups.detail.membership.requestNote")}
        </p>
      </>
    )
  } else if (view === "loading") {
    content = <Button disabled>{t("groups.detail.membership.request")}</Button>
  } else {
    content = (
      <>
        <Button asChild>
          <Link
            to={ROUTES.signup}
            search={{ from }}
          >
            {t("groups.detail.membership.request")}
          </Link>
        </Button>
        <p className="typo-small text-muted-foreground">
          {t("groups.detail.membership.hasAccount")}{" "}
          <Link
            to={ROUTES.login}
            search={{ from }}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t("groups.detail.membership.signIn")}
          </Link>
        </p>
      </>
    )
  }

  return (
    <aside
      aria-labelledby="membership-heading"
      className="flex h-fit flex-col items-start gap-3 lg:rounded-lg lg:border lg:border-border lg:p-4"
    >
      <h2
        id="membership-heading"
        className="typo-label-lg text-muted-foreground"
      >
        {t("groups.detail.membership.title")}
      </h2>
      {content}
      <Dialog
        open={isLeaveOpen}
        onOpenChange={setIsLeaveOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("groups.detail.membership.leaveTitle")}</DialogTitle>
            <DialogDescription>
              {t("groups.detail.membership.leaveText", { name: groupName })}
            </DialogDescription>
          </DialogHeader>
          {membership.leaveFailed ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("groups.detail.membership.leaveFailed")}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLeaveOpen(false)}
            >
              {t("groups.detail.membership.leaveStay")}
            </Button>
            <Button
              disabled={membership.isLeaving}
              onClick={() => void confirmLeave()}
            >
              {t("groups.detail.membership.leaveConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
