import { Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useDecideFriendRequest } from "@/features/friendship/hooks/useDecideFriendRequest"

type FriendRequestDecisionProps = {
  /** Who asks me. */
  senderId: string
  /** Their name, so each button says whose request it decides. */
  senderName: string
  /** Fetches the caller's own data again after the decision. */
  reload?: () => Promise<unknown>
  className?: string
}

/**
 * #228: "Přijmout" and "Zamítnout" a request someone sent me, side by side,
 * full width on phones. Rejecting asks nothing: it is silent and the person
 * may ask again.
 */
export function FriendRequestDecision({
  senderId,
  senderName,
  reload,
  className,
}: FriendRequestDecisionProps) {
  const { t } = useTranslation()
  const decide = useDecideFriendRequest(senderId, reload)
  const deciding = decide.isPending ? decide.variables : undefined

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1 md:flex-none"
          aria-label={t("friends.requests.acceptLabel", { name: senderName })}
          disabled={decide.isPending}
          onClick={() => decide.mutate("accept")}
        >
          <Check aria-hidden />
          {deciding === "accept" ? t("friends.requests.accepting") : t("friends.requests.accept")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 md:flex-none"
          aria-label={t("friends.requests.rejectLabel", { name: senderName })}
          disabled={decide.isPending}
          onClick={() => decide.mutate("reject")}
        >
          <X aria-hidden />
          {deciding === "reject" ? t("friends.requests.rejecting") : t("friends.requests.reject")}
        </Button>
      </div>
      {decide.isError ? (
        <p
          role="alert"
          className="typo-small text-destructive"
        >
          {t("friends.requests.decideError")}
        </p>
      ) : null}
    </div>
  )
}
