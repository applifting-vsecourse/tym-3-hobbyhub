import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import type { FriendListSort } from "@/features/friendship/api/friendshipSchemas"
import { FriendRequests } from "@/features/friendship/components/FriendRequests"
import { FriendSearch } from "@/features/friendship/components/FriendSearch"
import { FriendsList } from "@/features/friendship/components/FriendsList"
import { FriendsTabs } from "@/features/friendship/components/FriendsTabs"
import type { FriendsTab } from "@/features/friendship/lib/friendsSearch"

type FriendsSectionProps = {
  tab: FriendsTab
  /** #226: the order of the friends, from the address. */
  sort?: FriendListSort
  /** "Vyhledat uživatele" (#225): the text searched and the one in the field. */
  search?: {
    text: string
    typed: string
    onTypedChange: (typed: string) => void
  }
  /**
   * #226: the events of my friends; the event feature owns them. `preview`
   * (the nearest few) stands above the friends, `list` is „Akce přátel“.
   */
  friendsEvents?: { preview: ReactNode; list: ReactNode }
}

/**
 * Přátelé (#227): one place for the friends, their events, the friend requests
 * and finding people. #225 fills the search, #228 the requests, #226 the
 * friends and their events.
 */
export function FriendsSection({
  tab,
  sort = "newest",
  search,
  friendsEvents,
}: FriendsSectionProps) {
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
        ) : tab === "events" ? (
          friendsEvents?.list
        ) : (
          <div className="flex flex-col gap-8">
            {friendsEvents?.preview}
            <FriendsList sort={sort} />
          </div>
        )}
      </section>
    </div>
  )
}
