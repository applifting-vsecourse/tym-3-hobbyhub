import { Link } from "@tanstack/react-router"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

type InterestActionProps =
  | {
      /** The event is on the signed-in person's "Zajímá mě" list. */
      isSaved: boolean
      onToggle: () => void
    }
  | {
      /** A visitor: the button leads to the sign-in and back to this page. */
      signInFrom: string
    }

/**
 * #231: "Zajímá mě" on the event detail. One button that saves the event to
 * the person's list and shows "Uloženo" until tapped again (`aria-pressed`).
 * A visitor is sent to sign in (the sign-in links to the sign-up) and brought
 * back here.
 */
export function InterestAction(props: InterestActionProps) {
  const { t } = useTranslation()

  if ("signInFrom" in props) {
    return (
      <Button
        asChild
        variant="outline"
        className="rounded-full"
      >
        <Link
          to={ROUTES.login}
          search={{ from: props.signInFrom }}
        >
          <Bookmark aria-hidden />
          {t("interest.save")}
        </Link>
      </Button>
    )
  }

  const { isSaved, onToggle } = props
  return (
    <Button
      variant={isSaved ? "secondary" : "outline"}
      className="rounded-full"
      aria-pressed={isSaved}
      onClick={onToggle}
    >
      {isSaved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {t(isSaved ? "interest.saved" : "interest.save")}
    </Button>
  )
}
