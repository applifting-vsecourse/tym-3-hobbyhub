import { useEffect, useRef, type ReactNode } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { SCREEN_COUNT } from "@/features/onboarding/lib/onboardingLimits"

type OnboardingStepLayoutProps = {
  /** 1-based position of the screen in the wizard. */
  screen: number
  title: string
  description: string
  onSkipAll: () => void
  isBusy?: boolean
  /** Moves focus to the heading: a screen change does not move it by itself. */
  shouldFocusHeading?: boolean
  children: ReactNode
}

/** What every screen of the wizard shares: where you are, a way out, the heading. */
export function OnboardingStepLayout({
  screen,
  title,
  description,
  onSkipAll,
  isBusy = false,
  shouldFocusHeading = false,
  children,
}: OnboardingStepLayoutProps) {
  const { t } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (shouldFocusHeading) headingRef.current?.focus()
  }, [shouldFocusHeading])

  const progress = t("onboarding.progress", { current: screen, total: SCREEN_COUNT })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="typo-small text-muted-foreground">{progress}</p>
          <Button
            type="button"
            variant="ghost"
            className="-mr-3 text-muted-foreground max-md:h-11"
            disabled={isBusy}
            onClick={onSkipAll}
          >
            {t("onboarding.skipAll")}
          </Button>
        </div>
        <div
          role="progressbar"
          aria-label={t("onboarding.progressLabel")}
          aria-valuemin={1}
          aria-valuemax={SCREEN_COUNT}
          aria-valuenow={screen}
          aria-valuetext={progress}
          className="flex gap-1"
        >
          {Array.from({ length: SCREEN_COUNT }, (_, index) => (
            <span
              key={index}
              className={cn("h-1 flex-1 rounded-full", index < screen ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="typo-h1 text-foreground outline-none"
        >
          {title}
        </h1>
        <p className="typo-body text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

export function SaveError({ isVisible }: { isVisible: boolean }) {
  const { t } = useTranslation()
  if (!isVisible) return null

  return (
    <Alert variant="destructive">
      <AlertDescription>{t("onboarding.saveError")}</AlertDescription>
    </Alert>
  )
}

type StepActionsProps = {
  isSaving: boolean
  /** Nothing is filled in on the step: the same button then skips it. */
  isEmpty: boolean
  /** The last step: the way on ends the wizard. */
  isLast: boolean
  /** The wizard was opened from a page to return to, e.g. an event. */
  isReturningToEvent: boolean
  onSkip: () => void
  /** The previous step, without saving; absent on the first one. */
  onBack?: () => void
}

/**
 * One button for the way on, always the same: it saves what is filled in and
 * continues, and an empty step is simply passed (counted as skipped).
 */
export function StepActions({
  isSaving,
  isEmpty,
  isLast,
  isReturningToEvent,
  onSkip,
  onBack,
}: StepActionsProps) {
  const { t } = useTranslation()

  let label = t("onboarding.next")
  if (isLast) label = t(isReturningToEvent ? "onboarding.finishReturn" : "onboarding.finish")

  return (
    // On a phone pinned to the bottom and padded clear of the navigation, so the
    // way on never scrolls out of reach however long the step grows.
    <div className="flex gap-2 pt-3 max-md:sticky max-md:bottom-0 max-md:z-30 max-md:-mx-4 max-md:border-t max-md:border-border max-md:bg-background max-md:px-4 max-md:pb-above-bottom-nav md:pb-3">
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          {t("onboarding.back")}
        </Button>
      ) : null}
      <Button
        type={isEmpty ? "button" : "submit"}
        className="flex-1"
        disabled={isSaving}
        onClick={isEmpty ? onSkip : undefined}
      >
        {isSaving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : null}
        {label}
      </Button>
    </div>
  )
}
