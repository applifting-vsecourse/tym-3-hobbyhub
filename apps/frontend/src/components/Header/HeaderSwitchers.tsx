import { LanguageSwitcher } from "@/components/Header/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/Header/ThemeSwitcher"

/**
 * #262: language and theme in the header — only in the administration, which
 * has no Nastavení page. The app itself keeps them out of the header.
 */
export function HeaderSwitchers() {
  return (
    <>
      <LanguageSwitcher />
      <ThemeSwitcher />
    </>
  )
}
