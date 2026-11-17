import { Clock, Mail, UserPlus } from "lucide-react"
import { useTranslation } from "react-i18next"

import FriendHeartIcon from "@/assets/ui-icons/heart.svg?react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { FriendRelation } from "@/features/friendship/api/friendshipSchemas"
import { FriendRequestDecision } from "@/features/friendship/components/FriendRequestDecision"
import { RemoveFriend } from "@/features/friendship/components/RemoveFriend"
import { WithdrawFriendRequest } from "@/features/friendship/components/WithdrawFriendRequest"
import { useSendFriendRequest } from "@/features/friendship/hooks/useSendFriendRequest"

type FriendRelationActionProps = {
  /** Whose profile this is. */
  userId: string
  /** Their name, so the buttons say whose request they decide (#228). */
  userName: string
  relation: FriendRelation
  /** Fetches the profile again after a request, so it shows the real state. */
  reload: () => Promise<unknown>
}

/**
 * #225: under the bio of someone's profile, what I can do about friendship.
 * No relation: ask. Asked: a disabled "Žádost odeslána" and "Zrušit žádost".
 * They ask me: a band with the note and Přijmout / Zamítnout (#228). Friends: the "Přítel" badge and
 * "Odebrat z přátel" (#226).
 */
export function FriendRelationAction({
  userId,
  userName,
  relation,
  reload,
}: FriendRelationActionProps) {
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
              {t("friends.action.error")}
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
        <div className="flex flex-col gap-3 rounded-lg bg-accent px-4 py-3 text-accent-foreground">
          <p className="flex items-center gap-3 typo-body">
            <Mail
              aria-hidden
              className="size-5 shrink-0"
            />
            {t("friends.action.received")}
          </p>
          <FriendRequestDecision
            senderId={userId}
            senderName={userName}
          />
        </div>
      )
    case "friends":
      return (
        <div className="flex flex-col items-start gap-3">
          <Badge
            variant="success"
            className="px-3 py-1"
          >
            <FriendHeartIcon aria-hidden />
            {t("friends.relation.friends")}
          </Badge>
          <RemoveFriend
            friendId={userId}
            friendName={userName}
          />
        </div>
      )
  }
}
