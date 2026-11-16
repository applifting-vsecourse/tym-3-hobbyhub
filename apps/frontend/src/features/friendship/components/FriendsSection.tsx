import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { FriendsTabs } from "@/features/friendship/components/FriendsTabs"
import type { FriendsTab } from "@/features/friendship/lib/friendsSearch"

/**
 * Přátelé (#227): one place for finding people, the friends and the friend
 * requests. The tabs are empty for now: #225 fills the search, #226 the
 * friends and #228 the requests. Each says in one sentence what will be there.
 */
export function FriendsSection({ tab }: { tab: FriendsTab }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="typo-h1 text-foreground">{t("friends.title")}</h1>
      <FriendsTabs active={tab} />
      <section
        aria-label={t(`friends.tabs.${tab}`)}
        className="flex flex-col gap-3"
      >
        <p className="typo-body text-muted-foreground">{t(`friends.empty.${tab}`)}</p>
        {tab === "search" ? null : (
          <Button
            asChild
            variant="link"
            className="w-fit px-0"
          >
            <Link
              to={ROUTES.friends}
              search={{}}
            >
              {t("friends.empty.findPeople")}
            </Link>
          </Button>
        )}
      </section>
    </div>
  )
}
