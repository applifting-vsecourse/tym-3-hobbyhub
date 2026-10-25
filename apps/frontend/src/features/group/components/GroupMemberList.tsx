import { useTranslation } from "react-i18next"

import { ActivityAvatar } from "@/components/hobbyhub/ActivityAvatar"

import type { GroupMember } from "@/features/group/api/membershipRequestSchemas"
import { memberAvatar } from "@/features/group/lib/memberAvatar"

/**
 * The members of a group with their role, for its admins (F-07.3). Read only
 * for now: removing a member and naming admins come with #94.
 */
export function GroupMemberList({ members }: { members: GroupMember[] }) {
  const { t } = useTranslation()

  if (members.length === 0) {
    return <p className="typo-body text-muted-foreground">{t("groups.manage.membersEmpty")}</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex items-center gap-3 py-3"
        >
          <ActivityAvatar
            avatar={memberAvatar(member.userId)}
            size="md"
          />
          <div className="flex min-w-0 flex-col">
            <p className="truncate typo-title text-foreground">{member.name}</p>
            <p className="typo-small text-muted-foreground">
              {t(`groups.list.role.${member.role}`)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
