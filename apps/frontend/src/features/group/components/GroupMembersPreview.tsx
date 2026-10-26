import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ActivityAvatar } from "@/components/hobbyhub/ActivityAvatar"

import type { GroupMember } from "@/features/group/api/membershipRequestSchemas"
import { memberAvatar } from "@/features/group/lib/memberAvatar"

// The wireframe shows seven faces, then "+7".
const SHOWN_MEMBERS = 7

type GroupMembersPreviewProps = {
  groupId: string
  members: GroupMember[]
}

/**
 * Členové (N) on the group page, for its admins (F-07.3): a row of faces that
 * leads to member management. Everyone else sees only the count (F-02.5).
 */
export function GroupMembersPreview({ groupId, members }: GroupMembersPreviewProps) {
  const { t } = useTranslation()
  const shown = members.slice(0, SHOWN_MEMBERS)
  const rest = members.length - shown.length

  return (
    <section
      aria-labelledby="group-members-heading"
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <h2
        id="group-members-heading"
        className="typo-h3 text-foreground"
      >
        {t("groups.manage.membersTitle", { count: members.length })}
      </h2>
      <Link
        to="/groups/$groupId/members"
        params={{ groupId }}
        aria-label={t("groups.manage.membersLink")}
        className="flex w-fit flex-wrap items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {shown.map((member) => (
          <ActivityAvatar
            key={member.userId}
            avatar={memberAvatar(member.userId)}
            size="md"
          />
        ))}
        {rest > 0 ? (
          <span className="typo-label text-muted-foreground">
            {t("groups.manage.membersMore", { count: rest })}
          </span>
        ) : null}
      </Link>
    </section>
  )
}
