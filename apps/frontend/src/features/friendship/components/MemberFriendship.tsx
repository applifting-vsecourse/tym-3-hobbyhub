import { UserPlus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import type { FriendRelation } from "@/features/friendship/api/friendshipSchemas"
import { FriendRelationBadge } from "@/features/friendship/components/FriendRelationBadge"
import { useSendFriendRequest } from "@/features/friendship/hooks/useSendFriendRequest"

type MemberFriendshipProps = {
  userId: string
  /** The person's name, for the button's accessible name. */
  name: string
  relation: FriendRelation
  /** Fetches the list again after a request, so it shows the real state. */
  reload: () => Promise<unknown>
}

/**
 * #225: in a list of people (the members of a group), a small "Spřátelit" for
 * someone I have no relation with; otherwise the badge of where we stand.
 */
export function MemberFriendship({ userId, name, relation, reload }: MemberFriendshipProps) {
  const { t } = useTranslation()
  const send = useSendFriendRequest(userId, reload)

  if (relation !== "none") return <FriendRelationBadge relation={relation} />

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="max-md:h-11"
      aria-label={t("friends.action.sendShortLabel", { name })}
      disabled={send.isPending}
      onClick={() =>
        send.mutate(undefined, { onError: () => toast.error(t("friends.action.error")) })
      }
    >
      <UserPlus aria-hidden />
      {send.isPending ? t("friends.action.sendingShort") : t("friends.action.sendShort")}
    </Button>
  )
}
