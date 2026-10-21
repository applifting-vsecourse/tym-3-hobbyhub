import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { ErrorLayout } from "./ErrorLayout"

type RootErrorBoundaryProps = {
  error: Error
}

export function RootErrorBoundary({ error }: RootErrorBoundaryProps) {
  const { t } = useTranslation()

  // No AppShell: whatever broke may be the shell itself.
  return (
    <main className="grid min-h-svh place-content-center">
      <ErrorLayout
        title={t("errors.generic.title")}
        description={error.message || t("errors.generic.description")}
        action={
          <Button onClick={() => window.location.reload()}>{t("errors.generic.reload")}</Button>
        }
      />
    </main>
  )
}
