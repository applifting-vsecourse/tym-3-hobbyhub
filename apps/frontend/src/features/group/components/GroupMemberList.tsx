import { Fragment, useState } from "react"
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
import type { GroupMember } from "@/features/group/api/membershipRequestSchemas"
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
  members: GroupMember[]
  /** Who is looking; undefined while unknown, and then nobody gets a menu. */
  me?: { userId: string; role: GroupRole }
}

/**
 * The members of a group with their role, for its members (F-07.3). Each row
 * has a menu of what the viewer may do to that member (F-07.3b, ADR-0007);
 * a plain member sees no menus.
 */
export function GroupMemberList({ groupId, groupName, members, me }: GroupMemberListProps) {
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
              <ActivityAvatar
                avatar={memberAvatar(member.userId)}
                size="md"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate typo-title text-foreground">{member.name}</p>
                <p className="typo-small text-muted-foreground">
                  {t(`groups.list.role.${member.role}`)}
                </p>
              </div>
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
