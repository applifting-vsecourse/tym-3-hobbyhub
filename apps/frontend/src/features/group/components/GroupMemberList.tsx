import { Fragment, useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { Ellipsis } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ActivityAvatar } from "@/components/hobbyhub/ActivityAvatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { GroupRole } from "@/features/group/api/groupSchemas"
import type { GroupMemberListItem } from "@/features/group/api/membershipRequestSchemas"
import {
  MemberActionSheet,
  type PendingMemberAction,
} from "@/features/group/components/MemberActionSheet"
import { useMemberAction } from "@/features/group/hooks/useMemberAction"
import { memberActions } from "@/features/group/lib/memberActions"
import { memberAvatar } from "@/features/group/lib/memberAvatar"

type GroupMemberListProps = {
  groupId: string
  groupName: string
  members: GroupMemberListItem[]
  /** Who is looking; undefined while unknown, and then nobody gets a menu. */
  me?: { userId: string; role: GroupRole }
  /**
   * #225: the friendship with the member (ask for it, or where it stands);
   * the friendship feature owns it. Not called for my own row.
   */
  renderFriendship?: (member: GroupMemberListItem) => ReactNode
}

/**
 * The members of a group with their role, for its members (F-07.3). Each row
 * has a menu of what the viewer may do to that member (F-07.3b, ADR-0007);
 * a plain member sees no menus. The name leads to the member's profile, and
 * next to it is my friendship with them (#225).
 */
export function GroupMemberList({
  groupId,
  groupName,
  members,
  me,
  renderFriendship,
}: GroupMemberListProps) {
  const { t } = useTranslation()
  const mutation = useMemberAction(groupId)
  const [pending, setPending] = useState<PendingMemberAction | null>(null)

  const open = (next: PendingMemberAction) => {
    mutation.reset()
    setPending(next)
  }

  const confirm = ({ action, member }: PendingMemberAction) => {
    mutation.mutate(
      { action, userId: member.userId },
      {
        onSuccess: () => {
          setPending(null)
          toast.success(t(`groups.manage.actions.${action}.done`, { name: member.name }))
        },
      },
    )
  }

  if (members.length === 0) {
    return <p className="typo-body text-muted-foreground">{t("groups.manage.membersEmpty")}</p>
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {members.map((member) => {
          const actions = me ? memberActions(me, member) : []
          return (
            <li
              key={member.userId}
              className="flex items-center gap-3 py-3"
            >
              <Link
                to="/profile/$userId"
                params={{ userId: member.userId }}
                className="group/member flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
              >
                <ActivityAvatar
                  avatar={memberAvatar(member.userId)}
                  size="md"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate typo-title text-foreground underline-offset-4 group-hover/member:underline">
                    {member.name}
                  </span>
                  <span className="typo-small text-muted-foreground">
                    {t(`groups.list.role.${member.role}`)}
                  </span>
                </span>
              </Link>
              {renderFriendship && member.userId !== me?.userId ? (
                <div className="shrink-0">{renderFriendship(member)}</div>
              ) : null}
              {actions.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("groups.manage.actions.menuLabel", { name: member.name })}
                    >
                      <Ellipsis
                        aria-hidden
                        className="size-5"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actions.map((action) => (
                      <Fragment key={action}>
                        {action === "remove" && actions.length > 1 ? (
                          <DropdownMenuSeparator />
                        ) : null}
                        <DropdownMenuItem
                          variant={action === "remove" ? "destructive" : "default"}
                          onSelect={() => open({ action, member })}
                        >
                          {t(`groups.manage.actions.${action}.menu`)}
                        </DropdownMenuItem>
                      </Fragment>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </li>
          )
        })}
      </ul>
      <MemberActionSheet
        pending={pending}
        groupName={groupName}
        isPending={mutation.isPending}
        isError={mutation.isError}
        onClose={() => setPending(null)}
        onConfirm={confirm}
      />
    </>
  )
}
