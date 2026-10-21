import { RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/** The error state of any list of events: the message and a way to retry. */
export function EventsLoadError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { t } = useTranslation()

  return (
    <Alert variant="destructive">
      <AlertTitle>{t("events.list.loadError")}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{error.message}</span>
        {onRetry ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            <RefreshCw className="size-4" />
            {t("events.list.reload")}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
