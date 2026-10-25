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
import { Switch } from "@/components/ui/switch"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

import { PasswordInput } from "@/features/auth/components/PasswordInput"

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, t("auth.validation.emailRequired"))
      .pipe(z.email(t("auth.validation.emailInvalid"))),
    password: z.string().min(1, t("auth.validation.passwordRequired")),
    rememberMe: z.boolean(),
  })

export type SignInFormValues = z.infer<ReturnType<typeof createSchema>>

// Remembered by default: a session that ends with the browser surprises
// people on their own phone more than it protects them on a shared one.
const defaultValues: SignInFormValues = { email: "", password: "", rememberMe: true }

type SignInFormProps = {
  readonly isLoading: boolean
  readonly errorMessage?: string | null
  readonly onSubmit: (values: SignInFormValues) => void | Promise<void>
}

export function SignInForm({ isLoading, errorMessage, onSubmit }: SignInFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  useRevalidateOnLanguageChange(form)

  return (
    <AppForm
      form={form}
      onSubmit={onSubmit}
      // Half-typed credentials are nothing to protect.
      isGuarded={false}
      // Room for the submit bar fixed to the bottom on phones.
      className="space-y-4 pb-24 md:pb-0"
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

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.fields.password")}</FormLabel>
            <FormControl>
              <PasswordInput
                autoComplete="current-password"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="rememberMe"
        render={({ field }) => (
          <FormItem className="flex min-h-11 items-center justify-between gap-3">
            <FormLabel>{t("auth.signIn.rememberMe")}</FormLabel>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <p className="typo-small text-muted-foreground">{t("auth.signIn.lockoutNote")}</p>

      {/* On phones the action sits at the bottom of the screen, as in the wireframe. */}
      <div className="fixed inset-x-0 bottom-0 bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:mt-8 md:p-0">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("auth.signIn.submit")}
        </Button>
      </div>
    </AppForm>
  )
}
