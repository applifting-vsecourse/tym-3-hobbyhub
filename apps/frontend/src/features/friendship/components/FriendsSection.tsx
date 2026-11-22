import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

import { FriendRequests } from "@/features/friendship/components/FriendRequests"
import { FriendSearch } from "@/features/friendship/components/FriendSearch"
import { FriendsTabs } from "@/features/friendship/components/FriendsTabs"
import type { FriendsTab } from "@/features/friendship/lib/friendsSearch"

type FriendsSectionProps = {
  tab: FriendsTab
  /** "Vyhledat uživatele" (#225): the text searched and the one in the field. */
  search?: {
    text: string
    typed: string
    onTypedChange: (typed: string) => void
  }
}

/**
 * Přátelé (#227): one place for finding people, the friends and the friend
 * requests. #225 fills the search and #228 the requests; the friends (#226)
 * still say in one sentence what will be there.
 */
export function FriendsSection({ tab, search }: FriendsSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="typo-h1 text-foreground">{t("friends.title")}</h1>
      <FriendsTabs active={tab} />
      <section
        aria-label={t(`friends.tabs.${tab}`)}
        className="flex flex-col gap-3"
      >
        {tab === "search" ? (
          search ? (
            <FriendSearch {...search} />
          ) : null
        ) : tab === "requests" ? (
          <FriendRequests />
        ) : (
          <>
            <p className="typo-body text-muted-foreground">{t(`friends.empty.${tab}`)}</p>
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
          </>
        )}
      </section>
    </div>
  )
}
