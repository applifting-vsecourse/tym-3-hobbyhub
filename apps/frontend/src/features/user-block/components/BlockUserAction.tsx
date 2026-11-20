import { useState } from "react"
import { Ban, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ResponsiveSheet } from "@/components/hobbyhub/ResponsiveSheet"
import { Button } from "@/components/ui/button"

import { useBlockUser, useUnblockUser } from "@/features/user-block/hooks/useUserBlockMutations"

type BlockUserActionProps = {
  readonly user: { id: string; name: string; isBlockedByMe: boolean }
}

/**
 * #65, ADR-0028: "Zablokovat" on another person's profile, or, once blocked,
 * what the block means and "Odblokovat". Blocking undoes seats, memberships
 * and requests for good, so it asks first; unblocking undoes nothing and does
 * not.
 */
export function BlockUserAction({ user }: BlockUserActionProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const block = useBlockUser()
  const unblock = useUnblockUser()

  if (user.isBlockedByMe) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="typo-body text-muted-foreground">
          {t("userBlocks.profile.blocked", { name: user.name })}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={unblock.isPending}
          onClick={() =>
            unblock.mutate(user.id, {
              onSuccess: () => toast.success(t("userBlocks.unblocked", { name: user.name })),
              onError: () => toast.error(t("userBlocks.unblockFailed")),
            })
          }
        >
          {unblock.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("userBlocks.unblock")}
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="self-start"
        onClick={() => {
          block.reset()
          setIsOpen(true)
        }}
      >
        <Ban aria-hidden />
        {t("userBlocks.block")}
      </Button>
      <ResponsiveSheet
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t("userBlocks.confirm.title", { name: user.name })}
        footer={
          <>
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={block.isPending}
              onClick={() =>
                block.mutate(user.id, {
                  onSuccess: () => {
                    setIsOpen(false)
                    toast.success(t("userBlocks.blocked", { name: user.name }))
                  },
                })
              }
            >
              {block.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("userBlocks.confirm.submit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              {t("userBlocks.confirm.back")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 pb-1">
          <p className="typo-body text-foreground">{t("userBlocks.confirm.hidden")}</p>
          <p className="typo-body text-foreground">{t("userBlocks.confirm.ties")}</p>
          <p className="typo-body text-muted-foreground">{t("userBlocks.confirm.secret")}</p>
          {block.isError ? (
            <p
              role="alert"
              className="typo-small text-destructive"
            >
              {t("userBlocks.blockFailed")}
            </p>
          ) : null}
        </div>
      </ResponsiveSheet>
    </>
  )
}
