import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { useRemoveLocation } from "@/features/profile/hooks/useProfileMutations"

type RemoveLocationProps = {
  /** Called once the server has deleted the whole location. */
  onRemoved: () => void
}

/** Removes the home address, the temporary place and the travel radius in one step, after asking. */
export function RemoveLocation({ onRemoved }: RemoveLocationProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const removeLocation = useRemoveLocation()

  const remove = async () => {
    try {
      await removeLocation.mutateAsync()
    } catch {
      return
    }
    setIsOpen(false)
    onRemoved()
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => {
          removeLocation.reset()
          setIsOpen(true)
        }}
      >
        {t("profile.location.remove.button")}
      </Button>
      <Dialog
        open={isOpen}
        onOpenChange={(isNowOpen) => {
          if (!removeLocation.isPending) setIsOpen(isNowOpen)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("profile.location.remove.title")}</DialogTitle>
            <DialogDescription>{t("profile.location.remove.description")}</DialogDescription>
          </DialogHeader>
          {removeLocation.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{t("profile.location.remove.error")}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={removeLocation.isPending}
              onClick={() => setIsOpen(false)}
            >
              {t("profile.location.remove.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeLocation.isPending}
              onClick={() => void remove()}
            >
              {t("profile.location.remove.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
