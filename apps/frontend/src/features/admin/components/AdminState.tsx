import { useTranslation } from "react-i18next"

import { Loader } from "@/components/hobbyhub/Loader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type AdminQueryState = {
  isPending: boolean
  isError: boolean
  refetch: () => unknown
}

/**
 * The loading and error states every list and detail in the administration
 * shares (DESIGN.md "Every list has three states"). Null when there is data.
 */
export function AdminState({ query }: { query: AdminQueryState }) {
  const { t } = useTranslation()

  if (query.isPending) {
    return (
      <div className="flex justify-center py-8">
        <Loader label={t("admin.loading")} />
      </div>
    )
  }
  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center gap-3">
          {t("admin.loadFailed")}
          <Button
            variant="outline"
            size="sm"
            className="h-11 md:h-9"
            onClick={() => void query.refetch()}
          >
            {t("admin.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  return null
}
