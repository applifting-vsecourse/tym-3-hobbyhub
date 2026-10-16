import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z
    .object({
      email: z
        .string()
        .trim()
        .min(1, t("auth.validation.emailRequired"))
        .email(t("auth.validation.emailInvalid")),
      name: z.string().trim().min(1, t("auth.validation.nameRequired")),
      username: z.string().trim().min(1, t("auth.validation.usernameRequired")),
      password: z.string().trim().min(8, t("auth.validation.passwordMin")),
      passwordConfirmation: z
        .string()
        .trim()
        .min(1, t("auth.validation.passwordConfirmationRequired")),
    })
    .refine((values) => values.password === values.passwordConfirmation, {
      message: t("auth.validation.passwordsMustMatch"),
      path: ["passwordConfirmation"],
    })

type FormValues = z.infer<ReturnType<typeof createSchema>>

const defaultValues: FormValues = {
  email: "",
  name: "",
  username: "",
  password: "",
  passwordConfirmation: "",
}

type SignUpFormProps = {
  isLoading: boolean
  errorMessage?: string | null
  onSubmit: (values: FormValues) => void | Promise<void>
}

export function SignUpForm({ isLoading, errorMessage, onSubmit }: SignUpFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.fields.name")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.fields.username")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="passwordConfirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.fields.passwordConfirmation")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
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
          {t("auth.signUp.submit")}
        </Button>
      </form>
    </Form>
  )
}
