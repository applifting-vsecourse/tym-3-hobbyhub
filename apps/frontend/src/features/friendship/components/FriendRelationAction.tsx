import { Clock, Mail, UserPlus } from "lucide-react"
import { useTranslation } from "react-i18next"

import FriendHeartIcon from "@/assets/ui-icons/heart.svg?react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { sendFriendRequestErrorKey } from "@/features/friendship/api/friendshipRequests"
import type { FriendRelation } from "@/features/friendship/api/friendshipSchemas"
import { WithdrawFriendRequest } from "@/features/friendship/components/WithdrawFriendRequest"
import { useSendFriendRequest } from "@/features/friendship/hooks/useSendFriendRequest"

type FriendRelationActionProps = {
  /** Whose profile this is. */
  userId: string
  relation: FriendRelation
  /** Fetches the profile again after a request, so it shows the real state. */
  reload: () => Promise<unknown>
}

/**
 * #225: under the bio of someone's profile, what I can do about friendship.
 * No relation: ask. Asked: a disabled "Žádost odeslána" and "Zrušit žádost".
 * They ask me: a note,
 * to which #228 adds Přijmout and Zamítnout. Friends: the "Přítel" badge, to
 * which #226 adds removing the friend.
 */
export function FriendRelationAction({ userId, relation, reload }: FriendRelationActionProps) {
  const { t } = useTranslation()
  const send = useSendFriendRequest(userId, reload)

  switch (relation) {
    case "none":
      return (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="w-full md:w-fit"
            disabled={send.isPending}
            onClick={() => send.mutate()}
          >
            <UserPlus aria-hidden />
            {send.isPending ? t("friends.action.sending") : t("friends.action.send")}
          </Button>
          {send.isError ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t(sendFriendRequestErrorKey(send.error))}
            </p>
          ) : null}
        </div>
      )
    case "request_sent":
      return (
        <div className="flex flex-col gap-2 md:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-fit"
            disabled
          >
            <Clock aria-hidden />
            {t("friends.action.sent")}
          </Button>
          <WithdrawFriendRequest
            userId={userId}
            reload={reload}
          />
        </div>
      )
    case "request_received":
      return (
        <p className="flex items-center gap-3 rounded-lg bg-accent px-4 py-3 typo-body text-accent-foreground">
          <Mail
            aria-hidden
            className="size-5 shrink-0"
          />
          {t("friends.action.received")}
        </p>
      )
    case "friends":
      return (
        <Badge
          variant="success"
          className="px-3 py-1"
        >
          <FriendHeartIcon aria-hidden />
          {t("friends.relation.friends")}
        </Badge>
      )
  }
}
