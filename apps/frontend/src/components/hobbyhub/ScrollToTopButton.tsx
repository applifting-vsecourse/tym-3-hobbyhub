import { useLayoutEffect, useState } from "react"
import { ArrowUp } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** The id `AppShell` gives its `<main>`; focus lands there after the scroll. */
const MAIN_CONTENT_ID = "main-content"

/** Sub-pixel rounding after `scrollIntoView` must not count as "below". */
const TOLERANCE_PX = 1

type ScrollToTopButtonProps = {
  /**
   * The element to bring back to the top of the screen instead of the page's
   * own top, e.g. the section a sticky bar belongs to. Give it a
   * `scroll-margin-top` the height of the sticky header (`scroll-mt-14
   * md:scroll-mt-16`), or it ends up under the header. When it is not on the
   * page, the button goes to the page's top.
   */
  targetId?: string
  /**
   * Where focus goes afterwards, so a keyboard or screen reader user goes on
   * from there, not from a button now far below. By default the target (make
   * it focusable with `tabIndex={-1}`), or the page's main content.
   */
  focusTargetId?: string
  className?: string
}

/**
 * Whether the page is scrolled past where the button leads: the target is
 * above its place under the sticky header, or, without one, the page is not
 * at its top.
 */
function isPastTarget(targetId: string | undefined): boolean {
  const target = targetId ? document.getElementById(targetId) : null
  if (!target) return window.scrollY > TOLERANCE_PX
  const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  return target.getBoundingClientRect().top < margin - TOLERANCE_PX
}

/**
 * „Zpět nahoru“: a small ghost icon button for a bar that stays in sight
 * while a long page scrolls (#235: the progress of rating many participants).
 * Takes the page back to its top, or to `targetId`. Shown only once the page
 * is scrolled past that place; at it or above it, it hides but keeps its room,
 * so the bar does not jump. Smooth unless the person asks for reduced motion.
 * 44 px on phones, 36 px from `md`.
 */
export function ScrollToTopButton({ targetId, focusTargetId, className }: ScrollToTopButtonProps) {
  const { t } = useTranslation()
  const [isShown, setIsShown] = useState(false)

  // Before paint, so it never flashes in at the top of the page.
  useLayoutEffect(() => {
    const update = () => setIsShown(isPastTarget(targetId))
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [targetId])

  const scrollUp = () => {
    if (!isPastTarget(targetId)) return
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const behavior: ScrollBehavior = isReduced ? "auto" : "smooth"
    const target = targetId ? document.getElementById(targetId) : null

    if (target) target.scrollIntoView({ behavior, block: "start" })
    else window.scrollTo({ top: 0, behavior })

    const focusId = focusTargetId ?? (target ? targetId : MAIN_CONTENT_ID)
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t("common.scrollToTop")}
      // Hidden, it is out of sight, out of the tab order and out of the
      // accessibility tree, yet keeps its room in the bar.
      aria-hidden={!isShown || undefined}
      tabIndex={isShown ? undefined : -1}
      className={cn("shrink-0 max-md:size-11", !isShown && "invisible", className)}
      onClick={scrollUp}
    >
      <ArrowUp aria-hidden="true" />
    </Button>
  )
}
