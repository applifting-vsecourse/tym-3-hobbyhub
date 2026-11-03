import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

type GroupAdminPanelProps = {
  groupId: string
  /** Waiting requests; undefined while loading. */
  pendingCount: number | undefined
}

/** What only the group's admins see on its page (F-07.3): the way to the requests. */
export function GroupAdminPanel({ groupId, pendingCount }: GroupAdminPanelProps) {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby="group-admin-heading"
      className="flex flex-col gap-3 border-t border-border pt-4 lg:rounded-lg lg:border-t-0 lg:bg-muted lg:p-4"
    >
      <h2
        id="group-admin-heading"
        className="typo-label-lg text-muted-foreground"
      >
        {t("groups.manage.adminTitle")}
      </h2>
      <Button
        asChild
        variant="outline"
      >
        <Link
          to="/groups/$groupId/members"
          params={{ groupId }}
          search={{ tab: "requests" }}
        >
          {t("groups.manage.requestsLink", { count: pendingCount ?? 0 })}
        </Link>
      </Button>
    </section>
  )
}
