import { Monitor, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTheme } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"

const THEMES = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
] as const

/**
 * Vzhled (#215) — light, dark or as the system says, in the footer for
 * everyone, a visitor included. It applies to this device only, like the
 * same choice in Nastavení.
 */
export function ThemeChoice({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <ToggleGroup
      type="single"
      variant="segment"
      spacing={1}
      value={theme ?? "system"}
      // A theme is always chosen: clicking the current one keeps it.
      onValueChange={(next) => {
        if (next) setTheme(next)
      }}
      aria-label={t("settings.theme.label")}
      className={cn("h-11 rounded-full bg-muted p-1", className)}
    >
      {THEMES.map(({ value, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          className="h-full gap-1.5 px-3"
        >
          <Icon
            aria-hidden
            className="size-4"
          />
          {t(`settings.theme.${value}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
