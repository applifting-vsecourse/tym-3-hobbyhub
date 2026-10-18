import { useState, type ComponentProps } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type">

/**
 * Heslo with a "Zobrazit" toggle inside the field, in place of a second
 * "repeat password" field. Props (id, aria-*, ref) go to the input, so it
 * works inside `FormControl`.
 */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        className={cn("pr-24", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        aria-label={t(isVisible ? "auth.password.hideLabel" : "auth.password.showLabel")}
        className="absolute inset-y-0 right-0 h-12 text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => setIsVisible((isShown) => !isShown)}
      >
        {t(isVisible ? "auth.password.hide" : "auth.password.show")}
      </Button>
    </div>
  )
}
