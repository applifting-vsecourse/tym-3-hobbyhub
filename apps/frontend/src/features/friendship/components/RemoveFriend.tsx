import { useState } from "react"
import { Loader2, UserMinus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

import { useRemoveFriend } from "@/features/friendship/hooks/useRemoveFriend"

type RemoveFriendProps = {
  friendId: string
  friendName: string
  /**
   * `button`: the outlined button under the badge on the profile; `icon`: the
   * small one on a card in the friends list and the search.
   */
  variant?: "button" | "icon"
}

/**
 * #226: "Odebrat z přátel" on the profile, in the friends list and in the
 * search. It asks first. Not red: a new request undoes it (DESIGN.md keeps
 * the destructive look for what cannot be undone).
 */
export function RemoveFriend({ friendId, friendName, variant = "button" }: RemoveFriendProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const remove = useRemoveFriend(friendId)

  const open = () => {
    remove.reset()
    setIsOpen(true)
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative size-11 shrink-0 md:size-9"
          aria-label={t("friends.remove.buttonLabel", { name: friendName })}
          title={t("friends.remove.button")}
          onClick={open}
        >
          <UserMinus aria-hidden />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full md:w-fit"
          onClick={open}
        >
          <UserMinus aria-hidden />
          {t("friends.remove.button")}
        </Button>
      )}
      <ResponsiveSheet
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t("friends.remove.title")}
        hasCloseButton
        footer={
          <>
            <Button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(undefined, { onSuccess: () => setIsOpen(false) })}
            >
              {remove.isPending ? (
                <Loader2
                  aria-hidden
                  className="size-4 animate-spin"
                />
              ) : null}
              {t("friends.remove.confirm")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              {t("friends.remove.keep")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-1">
          <p className="typo-body text-foreground">
            {t("friends.remove.text", { name: friendName })}
          </p>
          {remove.isError ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("friends.remove.error")}
            </p>
          ) : null}
        </div>
      </ResponsiveSheet>
    </>
  )
}
