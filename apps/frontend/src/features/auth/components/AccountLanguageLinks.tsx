import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { LanguageLinks } from "@/components/LanguageLinks"

import { useSaveLanguage } from "@/features/auth/hooks/useSaveLanguage"
import { useSession } from "@/features/auth/hooks/useSession"

/**
 * #262: the footer's language links. A visitor's choice stays in this browser;
 * a signed-in user's goes to the account, the same as from Nastavení, and the
 * app switches once it is saved.
 */
export function AccountLanguageLinks({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { user } = useSession()
  const save = useSaveLanguage()

  if (!user) return <LanguageLinks className={className} />

  return (
    <LanguageLinks
      className={className}
      isDisabled={save.isPending}
      onSelect={(language) =>
        save.mutate(language, { onError: () => toast.error(t("language.saveFailed")) })
      }
    />
  )
}
