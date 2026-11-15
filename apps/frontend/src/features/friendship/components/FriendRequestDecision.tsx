import { Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { HTTPError } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import { useDecideFriendRequest } from "@/features/friendship/hooks/useDecideFriendRequest"

type FriendRequestDecisionProps = {
  /** Who asks me. */
  senderId: string
  /** Their name, so each button says whose request it decides. */
  senderName: string
  /** Fetches the caller's own data again after the decision. */
  reload?: () => Promise<unknown>
  /**
   * Where a failure is said: under the buttons, or in a toast where the
   * buttons may be gone once the list loads again (the tab „Žádosti“ drops
   * a request from a blocked account).
   */
  errorAs?: "inline" | "toast"
  className?: string
}

/** The sentence for a failed decision: the account is gone (404), or try again. */
const decideErrorKey = (error: unknown) =>
  error instanceof HTTPError && error.response.status === 404
    ? "friends.requests.unavailable"
    : "friends.requests.decideError"

/**
 * #228: "Přijmout" and "Zamítnout" a request someone sent me, side by side,
 * full width on phones. Rejecting asks nothing: it is silent and the person
 * may ask again.
 */
export function FriendRequestDecision({
  senderId,
  senderName,
  reload,
  errorAs = "inline",
  className,
}: FriendRequestDecisionProps) {
  const { t } = useTranslation()
  // The toast goes from the mutation itself, not from `mutate(…, { onError })`:
  // those callbacks are skipped once the card has left the list, which the
  // reload after a failure does to a request from a blocked account.
  const decide = useDecideFriendRequest(senderId, {
    reload,
    onError: (error) => {
      if (errorAs === "toast") toast.error(t(decideErrorKey(error)))
    },
  })
  const deciding = decide.isPending ? decide.variables : undefined

  const run = (decision: "accept" | "reject") => decide.mutate(decision)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1 md:flex-none"
          aria-label={t("friends.requests.acceptLabel", { name: senderName })}
          disabled={decide.isPending}
          onClick={() => run("accept")}
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
          onClick={() => run("reject")}
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
          {t(decideErrorKey(decide.error))}
        </p>
      ) : null}
    </div>
  )
}
