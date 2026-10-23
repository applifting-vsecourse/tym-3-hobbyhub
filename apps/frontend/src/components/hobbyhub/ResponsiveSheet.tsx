import type { ReactNode } from "react"
import { XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"

type ResponsiveSheetProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Optional element that opens the sheet (rendered with asChild). */
  trigger?: ReactNode
  title: string
  description?: string
  /** Small action next to the title, e.g. a ghost "Vymazat". */
  headerAction?: ReactNode
  /** Sticky bottom area, usually the one primary action. */
  footer?: ReactNode
  /** A close button on the phone drawer too; the desktop dialog always has one. */
  hasCloseButton?: boolean
  /**
   * On phones, put the footer at the end of the content instead of pinning it.
   * For sheets with a text field: the on-screen keyboard leaves the drawer so
   * little room that a pinned footer covers the field.
   */
  isFooterScrolling?: boolean
  children: ReactNode
}

/**
 * Spodní panel — a bottom drawer on phones, a dialog from `md` up. Use it for
 * secondary tasks that keep the page underneath: filters, sharing an event.
 */
export function ResponsiveSheet({
  isOpen,
  onOpenChange,
  trigger,
  title,
  description,
  headerAction,
  footer,
  hasCloseButton = false,
  isFooterScrolling = false,
  children,
}: ResponsiveSheetProps) {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  const titleRow = (Title: typeof DialogTitle | typeof DrawerTitle, action = headerAction) => (
    <div className="flex items-center justify-between gap-3">
      <Title>{title}</Title>
      {action}
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={onOpenChange}
      >
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
          <DialogHeader className="pr-8">
            {titleRow(DialogTitle)}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="-mx-6 overflow-y-auto px-6">{children}</div>
          {footer ? <DialogFooter className="sm:flex-col">{footer}</DialogFooter> : null}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
      <DrawerContent>
        <DrawerHeader>
          {titleRow(
            DrawerTitle,
            headerAction ??
              (hasCloseButton ? (
                <DrawerClose asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label={t("common.close")}
                  >
                    <XIcon />
                  </Button>
                </DrawerClose>
              ) : null),
          )}
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <div className={cn("overflow-y-auto px-5 pt-3", (!footer || isFooterScrolling) && "pb-6")}>
          {children}
          {footer && isFooterScrolling ? (
            <div className="flex flex-col gap-2 pt-4">{footer}</div>
          ) : null}
        </div>
        {footer && !isFooterScrolling ? <DrawerFooter>{footer}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  )
}
