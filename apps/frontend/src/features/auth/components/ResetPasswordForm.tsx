import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

import { PasswordInput } from "@/features/auth/components/PasswordInput"

// The same limit as sign-up; the server checks it again. Administrators need
// a longer one (#237), which they pass as `minLength`.
const USER_PASSWORD_MIN_LENGTH = 8

const createSchema = (t: TFunction, minLength: number) =>
  z.object({
    password: z
      .string()
      .min(
        minLength,
        minLength === USER_PASSWORD_MIN_LENGTH
          ? t("auth.validation.passwordMin")
          : t("auth.validation.passwordMinLength", { minimum: minLength }),
      ),
  })

export type ResetPasswordFormValues = z.infer<ReturnType<typeof createSchema>>

type ResetPasswordFormProps = {
  readonly isLoading: boolean
  readonly errorMessage?: string | null
  readonly onSubmit: (values: ResetPasswordFormValues) => void | Promise<void>
  readonly minLength?: number
}

/** F-03.5: the new password; "Zobrazit" in the field stands in for a repeat field. */
export function ResetPasswordForm({
  isLoading,
  errorMessage,
  onSubmit,
  minLength = USER_PASSWORD_MIN_LENGTH,
}: ResetPasswordFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t, minLength), [t, minLength])
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  })
  useRevalidateOnLanguageChange(form)

  return (
    <AppForm
      form={form}
      onSubmit={onSubmit}
      // A password half typed is nothing to protect.
      isGuarded={false}
      className="space-y-4"
    >
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.fields.password")}</FormLabel>
            <FormControl>
              <PasswordInput
                autoComplete="new-password"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("auth.resetPassword.submit")}
      </Button>
    </AppForm>
  )
}
