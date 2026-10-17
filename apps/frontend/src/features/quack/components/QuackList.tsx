import { Loader2, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

type QuackListProps = {
  quacks: Quack[]
  isLoading?: boolean
  error?: Error
  onReload?: () => void
}

export function QuackList({ quacks, isLoading, error, onReload }: QuackListProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col">
      {isLoading && quacks.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : null}

      {error ? (
        <Alert
          variant="destructive"
          className="mb-4"
        >
          <AlertTitle>{t("quacks.list.loadError")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            {onReload ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onReload}
              >
                <RefreshCw className="size-4" />
                {t("quacks.list.reload")}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && quacks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("quacks.list.empty")}</p>
      ) : null}

      {quacks.map((quack) => (
        <QuackItem
          key={quack.id}
          quack={quack}
        />
      ))}
    </div>
  )
}
