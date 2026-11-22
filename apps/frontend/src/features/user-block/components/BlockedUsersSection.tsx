import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Loader2, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Loader } from "@/components/hobbyhub/Loader"
import { PersonAvatar } from "@/components/hobbyhub/PersonAvatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { blockedUsersQueryOptions } from "@/features/user-block/api/userBlockRequests"
import type { BlockedUser } from "@/features/user-block/api/userBlockSchemas"
import { useUnblockUser } from "@/features/user-block/hooks/useUserBlockMutations"

/**
 * #65, ADR-0031: the people the user blocked, in Nastavení, each with
 * "Odblokovat". Only the user sees the list (visibility matrix).
 */
export function BlockedUsersSection() {
  const { t } = useTranslation()
  const headingId = useId()
  const query = useQuery(blockedUsersQueryOptions())

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 border-t border-border pt-8"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={headingId}
          className="typo-h3 text-foreground"
        >
          {t("userBlocks.settings.title")}
        </h2>
        <p className="typo-small text-muted-foreground">{t("userBlocks.settings.description")}</p>
      </div>

      {query.isPending ? (
        <Loader
          variant="player"
          label={t("userBlocks.settings.loading")}
        />
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{t("userBlocks.settings.loadError")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-md:h-11"
              onClick={() => void query.refetch()}
            >
              <RefreshCw className="size-4" />
              {t("userBlocks.settings.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : query.data.length === 0 ? (
        <p className="typo-body text-muted-foreground">{t("userBlocks.settings.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {query.data.map((user) => (
            <BlockedUserRow
              key={user.id}
              user={user}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function BlockedUserRow({ user }: { user: BlockedUser }) {
  const { t, i18n } = useTranslation()
  const unblock = useUnblockUser()
  const blockedAt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: "medium" }).format(
    user.blockedAt,
  )

  return (
    <li className="flex items-center gap-3 py-3">
      <PersonAvatar
        name={user.name}
        photo={user.image}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to="/profile/$userId"
          params={{ userId: user.id }}
          className="truncate typo-label-lg text-foreground underline-offset-4 hover:underline"
        >
          {user.name}
        </Link>
        <span className="typo-small text-muted-foreground">
          {t("userBlocks.settings.blockedAt", { date: blockedAt })}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="max-md:h-11"
        disabled={unblock.isPending}
        aria-label={t("userBlocks.settings.unblockLabel", { name: user.name })}
        onClick={() =>
          unblock.mutate(user.id, {
            onSuccess: () => toast.success(t("userBlocks.unblocked", { name: user.name })),
            onError: () => toast.error(t("userBlocks.unblockFailed")),
          })
        }
      >
        {unblock.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("userBlocks.unblock")}
      </Button>
    </li>
  )
}
