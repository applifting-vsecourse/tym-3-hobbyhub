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
import { Input } from "@/components/ui/input"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

const createSchema = (t: TFunction) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t("auth.validation.emailRequired"))
      .pipe(z.email(t("auth.validation.emailInvalid"))),
  })

export type ForgotPasswordFormValues = z.infer<ReturnType<typeof createSchema>>

type ForgotPasswordFormProps = {
  readonly isLoading: boolean
  readonly errorMessage?: string | null
  readonly onSubmit: (values: ForgotPasswordFormValues) => void | Promise<void>
}

/** F-03.5: the e-mail of the account that lost its password. */
export function ForgotPasswordForm({ isLoading, errorMessage, onSubmit }: ForgotPasswordFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })
  useRevalidateOnLanguageChange(form)

  return (
    <AppForm
      form={form}
      onSubmit={onSubmit}
      // One address: nothing to protect.
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
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.fields.email")}</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder={t("auth.placeholders.email")}
                autoComplete="email"
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
        {t("auth.forgotPassword.submit")}
      </Button>
    </AppForm>
  )
}
