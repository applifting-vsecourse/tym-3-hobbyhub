import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { LanguageChoice } from "@/components/LanguageChoice"

import { useSaveLanguage } from "@/features/auth/hooks/useSaveLanguage"
import { useSession } from "@/features/auth/hooks/useSession"

/**
 * #262, #215: the footer's language switch. A visitor's choice stays in this browser;
 * a signed-in user's goes to the account, the same as from Nastavení, and the
 * app switches once it is saved.
 */
export function AccountLanguageChoice({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { user } = useSession()
  const save = useSaveLanguage()

  if (!user) return <LanguageChoice className={className} />

  return (
    <LanguageChoice
      className={className}
      isDisabled={save.isPending}
      onSelect={(language) =>
        save.mutate(language, { onError: () => toast.error(t("language.saveFailed")) })
      }
    />
  )
}
