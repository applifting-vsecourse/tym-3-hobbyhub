import { useId } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import type { MyRequestState } from "@/features/participation-request/api/participationRequestSchemas"
import { RequestToJoinSheet } from "@/features/participation-request/components/RequestToJoinSheet"
import { refusalOf } from "@/features/participation-request/lib/joinPanel"

type JoinRequestActionProps = {
  eventId: string
  /** Undefined while loading, or when it failed: then the server decides on send. */
  state: MyRequestState | undefined
  isLoading: boolean
  /** Refreshes the page around the request once it is sent or refused. */
  onChange?: () => Promise<unknown>
}

/** The free seat's button for a signed-in person: ask to join, or why not. */
export function JoinRequestAction({ eventId, state, isLoading, onChange }: JoinRequestActionProps) {
  const { t } = useTranslation()
  const reasonId = useId()
  const refusal = state ? refusalOf(state.violations) : null

  if (isLoading) {
    return <Button disabled>{t("events.detail.join")}</Button>
  }

  if (refusal) {
    return (
      <>
        <Button
          disabled
          aria-describedby={reasonId}
        >
          {t("events.detail.join")}
        </Button>
        <p
          id={reasonId}
          className="text-center typo-small text-accent-foreground"
        >
          {t(`participationRequests.refused.${refusal}`)}
        </p>
      </>
    )
  }

  return (
    <RequestToJoinSheet
      eventId={eventId}
      onChange={onChange}
      trigger={<Button>{t("events.detail.join")}</Button>}
    />
  )
}
