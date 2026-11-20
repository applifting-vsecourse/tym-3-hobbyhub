import { Clock, Mail } from "lucide-react"
import { useTranslation } from "react-i18next"

import FriendHeartIcon from "@/assets/ui-icons/heart.svg?react"
import { Badge } from "@/components/ui/badge"

import type { FriendRelation } from "@/features/friendship/api/friendshipSchemas"

/**
 * #225: where I stand with a person found in the search. No badge without a
 * relation. "Chce se spřátelit" sits on the accent tint: something waits for me.
 */
export function FriendRelationBadge({ relation }: { relation: FriendRelation }) {
  const { t } = useTranslation()

  switch (relation) {
    case "none":
      return null
    case "request_sent":
      return (
        <Badge variant="pending">
          <Clock aria-hidden />
          {t("friends.relation.request_sent")}
        </Badge>
      )
    case "request_received":
      return (
        <Badge
          variant="secondary"
          className="bg-accent text-accent-foreground"
        >
          <Mail aria-hidden />
          {t("friends.relation.request_received")}
        </Badge>
      )
    case "friends":
      return (
        <Badge variant="success">
          <FriendHeartIcon aria-hidden />
          {t("friends.relation.friends")}
        </Badge>
      )
  }
}
