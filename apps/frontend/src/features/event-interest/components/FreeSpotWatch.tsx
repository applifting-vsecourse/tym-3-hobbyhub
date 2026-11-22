import { useId } from "react"
import { Link } from "@tanstack/react-router"
import { Bell, BellRing } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

type FreeSpotWatchProps =
  | {
      /** The signed-in person watches the event for a free seat. */
      isWatching: boolean
      onToggle: () => void
    }
  | {
      /** A visitor: the button leads to the sign-in and back to this page. */
      signInFrom: string
    }

/**
 * #232: "Hlídat volné místo" in the seat panel of a full event. One button
 * that turns the watching on and shows "Hlídám volné místo" until tapped again
 * (`aria-pressed`), with what it means under it: a notification once a seat
 * frees up, and no seat held, whoever signs up first gets it. A visitor is
 * sent to sign in (the sign-in links to the sign-up) and brought back here.
 */
export function FreeSpotWatch(props: FreeSpotWatchProps) {
  const { t } = useTranslation()
  const textId = useId()
  const isWatching = "isWatching" in props && props.isWatching

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-accent p-4 text-accent-foreground">
      <p
        id={textId}
        className="typo-small"
      >
        {t(isWatching ? "interest.watch.onText" : "interest.watch.offText")}
      </p>
      {"signInFrom" in props ? (
        <Button
          asChild
          variant="outline"
        >
          <Link
            to={ROUTES.login}
            search={{ from: props.signInFrom }}
            aria-describedby={textId}
          >
            <Bell aria-hidden />
            {t("interest.watch.start")}
          </Link>
        </Button>
      ) : (
        <Button
          variant={isWatching ? "secondary" : "outline"}
          aria-pressed={isWatching}
          aria-describedby={textId}
          onClick={props.onToggle}
        >
          {isWatching ? <BellRing aria-hidden /> : <Bell aria-hidden />}
          {t(isWatching ? "interest.watch.active" : "interest.watch.start")}
        </Button>
      )}
    </div>
  )
}
