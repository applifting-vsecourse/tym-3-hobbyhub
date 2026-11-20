import { useId } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import type { MyRequestState } from "@/features/participation-request/api/participationRequestSchemas"
import { refusalOf } from "@/features/participation-request/lib/joinPanel"

type JoinRequestActionProps = {
  /** "Požádat o účast" when the organizer approves, "Obsadit místo" when the seat is taken at once. */
  label: string
  /** Undefined while loading, or when it failed: then the server decides on send. */
  state: MyRequestState | undefined
  isLoading: boolean
  /** Opens the request sheet, which the page owns. */
  onRequest: () => void
}

/** The free seat's button for a signed-in person: ask to join, or why not. */
export function JoinRequestAction({ label, state, isLoading, onRequest }: JoinRequestActionProps) {
  const { t } = useTranslation()
  const reasonId = useId()
  const refusal = state ? refusalOf(state.violations) : null

  if (isLoading) {
    return <Button disabled>{label}</Button>
  }

  if (refusal) {
    return (
      <>
        <Button
          disabled
          aria-describedby={reasonId}
        >
          {label}
        </Button>
        <p
          id={reasonId}
          className="text-center typo-small text-accent-foreground"
        >
          {t(`participationRequests.refused.${refusal}`)}
          {/* #65: the block is the person's own, and so is the way back. */}
          {refusal === "BLOCKED_ORGANIZER" ? (
            <>
              {" "}
              <Link
                to={ROUTES.settings}
                className="underline underline-offset-4"
              >
                {t("userBlocks.manageLink")}
              </Link>
            </>
          ) : null}
        </p>
      </>
    )
  }

  return <Button onClick={onRequest}>{label}</Button>
}
