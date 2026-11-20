import { useState } from "react"
import { Loader2, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

import { useWithdrawFriendRequest } from "@/features/friendship/hooks/useWithdrawFriendRequest"

type WithdrawFriendRequestProps = {
  userId: string
  reload: () => Promise<unknown>
}

/**
 * #225: "Zrušit žádost" next to a sent request, on the recipient's profile
 * only. It asks first; a withdrawn request can be sent again at any time.
 */
export function WithdrawFriendRequest({ userId, reload }: WithdrawFriendRequestProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const withdraw = useWithdrawFriendRequest(userId, reload)

  const open = () => {
    withdraw.reset()
    setIsOpen(true)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full md:w-fit"
        onClick={open}
      >
        <X aria-hidden />
        {t("friends.withdraw.button")}
      </Button>
      <ResponsiveSheet
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t("friends.withdraw.title")}
        hasCloseButton
        footer={
          <>
            <Button
              type="button"
              disabled={withdraw.isPending}
              onClick={() => withdraw.mutate(undefined, { onSuccess: () => setIsOpen(false) })}
            >
              {withdraw.isPending ? (
                <Loader2
                  aria-hidden
                  className="size-4 animate-spin"
                />
              ) : null}
              {t("friends.withdraw.confirm")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              {t("friends.withdraw.keep")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-1">
          <p className="typo-body text-foreground">{t("friends.withdraw.text")}</p>
          {withdraw.isError ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("friends.withdraw.error")}
            </p>
          ) : null}
        </div>
      </ResponsiveSheet>
    </>
  )
}
