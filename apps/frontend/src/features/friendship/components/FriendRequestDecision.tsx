import { Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useDecideFriendRequest } from "@/hooks/useDecideFriendRequest"
import { FRIEND_REQUEST_STALE_MESSAGE, friendRequestDecisionErrorKey } from "@/lib/friend-requests"
import { cn } from "@/lib/utils"

type FriendRequestDecisionProps = {
  /** Who asks me. */
  senderId: string
  /** Their name, so each button says whose request it decides. */
  senderName: string
  /**
   * Where a failure is said: under the buttons, or in a toast where the
   * buttons may be gone once the list loads again (the tab „Žádosti“ drops
   * a request from a blocked account).
   */
  errorAs?: "inline" | "toast"
  className?: string
}

/**
 * #228: "Přijmout" and "Zamítnout" a request someone sent me, side by side,
 * full width on phones. Rejecting asks nothing: it is silent and the person
 * may ask again. The call, its answers and what loads again afterwards are
 * shared with the bell (`useDecideFriendRequest`).
 */
export function FriendRequestDecision({
  senderId,
  senderName,
  errorAs = "inline",
  className,
}: FriendRequestDecisionProps) {
  const { t } = useTranslation()
  // A request no longer there is said in a toast: the card or the band it
  // was in leaves the screen once the real state has loaded.
  const decide = useDecideFriendRequest(senderId, {
    onStale: () => toast(t(FRIEND_REQUEST_STALE_MESSAGE)),
    onError: (error) => {
      if (errorAs === "toast") toast.error(t(friendRequestDecisionErrorKey(error)))
    },
  })
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
      {errorAs === "inline" && decide.isError ? (
        <p
          role="alert"
          className="typo-small text-destructive"
        >
          {t(friendRequestDecisionErrorKey(decide.error))}
        </p>
      ) : null}
    </div>
  )
}
