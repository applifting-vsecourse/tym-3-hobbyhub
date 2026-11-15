import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/Seo"

import { useSearchText } from "@/features/event/hooks/useSearchText"
import { FriendsSection } from "@/features/friendship/components/FriendsSection"
import { friendsSearchSchema } from "@/features/friendship/lib/friendsSearch"

export const Route = createFileRoute("/_ProtectedPages/friends")({
  component: FriendsPage,
  validateSearch: friendsSearchSchema,
})

// Přátelé (#227): signed-in only, like everything under _ProtectedPages.
function FriendsPage() {
  const { t } = useTranslation()
  const { tab = "search", q = "" } = Route.useSearch()
  const navigate = Route.useNavigate()
  // #225: the text follows the typing into the address after a pause, without
  // a history entry per letter, so going back from a profile shows the same people.
  const [typed, setTyped] = useSearchText(
    q,
    (next) =>
      void navigate({
        search: (previous) => ({ ...previous, q: next === "" ? undefined : next }),
        replace: true,
      }),
  )

  return (
    <>
      <Seo title={t("friends.title")} />
      <section className="mx-auto flex w-full max-w-2xl flex-col px-4 py-6 md:py-12">
        <FriendsSection
          tab={tab}
          search={{ text: q, typed, onTypedChange: setTyped }}
        />
      </section>
    </>
  )
}
