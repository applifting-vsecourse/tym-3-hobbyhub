import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/Seo"

import { FriendsSection } from "@/features/friendship/components/FriendsSection"
import { friendsSearchSchema } from "@/features/friendship/lib/friendsSearch"

export const Route = createFileRoute("/_ProtectedPages/friends")({
  component: FriendsPage,
  validateSearch: friendsSearchSchema,
})

// Přátelé (#227): signed-in only, like everything under _ProtectedPages.
function FriendsPage() {
  const { t } = useTranslation()
  const { tab = "search" } = Route.useSearch()

  return (
    <>
      <Seo title={t("friends.title")} />
      <section className="mx-auto flex w-full max-w-2xl flex-col px-4 py-6 md:py-12">
        <FriendsSection tab={tab} />
      </section>
    </>
  )
}
