import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { toggleVariants } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

import {
  NOTIFICATION_KINDS,
  type NotificationKind,
} from "@/features/notification/api/notificationSchemas"

const OPTIONS = [undefined, ...NOTIFICATION_KINDS] as const

/**
 * Vše · Přihlášky · Akce · Skupiny · Ostatní (#175) — links, because the
 * filter lives in the URL, drawn as the kit's filter chips.
 */
export function NotificationKindFilter({ active }: { active: NotificationKind | undefined }) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t("notifications.kinds.label")}
      className="flex flex-wrap gap-2"
    >
      {OPTIONS.map((kind) => {
        const isActive = kind === active
        return (
          <Link
            key={kind ?? "all"}
            to={ROUTES.notifications}
            search={kind === undefined ? {} : { kind }}
            // The router sets `aria-current`; matched exactly, or "Vše" (no
            // search) would count as a part of every other chip.
            activeOptions={{ exact: true, includeSearch: true }}
            data-state={isActive ? "on" : "off"}
            className={cn(toggleVariants({ variant: "chip" }), "h-11 px-3 md:h-9")}
          >
            {t(`notifications.kinds.${kind ?? "all"}`)}
          </Link>
        )
      })}
    </nav>
  )
}
