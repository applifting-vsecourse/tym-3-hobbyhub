import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm, type DefaultValues } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { AppForm } from "@/components/form/AppForm"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

import { BirthDatePicker } from "@/features/auth/components/BirthDatePicker"
import { PasswordInput } from "@/features/auth/components/PasswordInput"
import { isAdult } from "@/features/auth/lib/birthDate"

const GENDERS = ["MALE", "FEMALE"] as const

const GENDER_LABELS = {
  MALE: "auth.gender.male",
  FEMALE: "auth.gender.female",
} as const

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z
    .object({
      name: z.string().trim().min(1, t("auth.validation.nameRequired")),
      email: z
        .string()
        .trim()
        .min(1, t("auth.validation.emailRequired"))
        .pipe(z.email(t("auth.validation.emailInvalid"))),
      password: z.string().min(8, t("auth.validation.passwordMin")),
      confirmPassword: z.string().min(1, t("auth.validation.confirmPasswordRequired")),
      gender: z.enum(GENDERS, { message: t("auth.validation.genderRequired") }),
      birthDate: z
        .string()
        .min(1, t("auth.validation.birthDateRequired"))
        .refine((value) => isAdult(value, new Date()), t("auth.validation.underage")),
      termsAccepted: z.boolean().refine(Boolean, t("auth.validation.termsRequired")),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("auth.validation.passwordsMismatch"),
      // Runs even while other fields are invalid, so a typo shows up at once.
      when: ({ value }) =>
        z.object({ password: z.string(), confirmPassword: z.string() }).safeParse(value).success,
    })

export type SignUpFormValues = z.infer<ReturnType<typeof createSchema>>

// Gender has no default: the user picks one.
const defaultValues: DefaultValues<SignUpFormValues> = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  birthDate: "",
  termsAccepted: false,
}

type SignUpFormProps = {
  readonly isLoading: boolean
  readonly errorMessage?: string | null
  readonly onSubmit: (values: SignUpFormValues) => void | Promise<void>
}

export function SignUpForm({ isLoading, errorMessage, onSubmit }: SignUpFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    // Password rules and the match show up while typing, not after submit.
    mode: "onChange",
  })
  useRevalidateOnLanguageChange(form)

  return (
    <AppForm
      form={form}
      onSubmit={onSubmit}
      // Nothing is lost by leaving a sign-up half-way.
      isGuarded={false}
      className="flex flex-col gap-4"
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
                autoComplete="nickname"
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
        rules={{ deps: "confirmPassword" }}
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

      <FormField
        control={form.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.fields.confirmPassword")}</FormLabel>
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

      <FormField
        control={form.control}
        name="birthDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.fields.birthDate")}</FormLabel>
            <FormControl>
              <BirthDatePicker {...field} />
            </FormControl>
            <FormDescription>{t("auth.signUp.privacyNote")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("auth.fields.gender")}</FormLabel>
            <Select
              name={field.name}
              value={field.value ?? ""}
              onValueChange={field.onChange}
            >
              <FormControl>
                <SelectTrigger
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className="w-full"
                >
                  <SelectValue placeholder={t("auth.placeholders.gender")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {GENDERS.map((gender) => (
                  <SelectItem
                    key={gender}
                    value={gender}
                  >
                    {t(GENDER_LABELS[gender])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>{t("auth.signUp.genderNote")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="termsAccepted"
        render={({ field }) => (
          <FormItem className="flex items-start gap-3">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            </FormControl>
            <div className="grid gap-1">
              <FormLabel className="block typo-small text-muted-foreground">
                <Trans
                  i18nKey="auth.signUp.terms"
                  components={{
                    // Not <link>: that is a void HTML element, so it would drop the text.
                    terms: (
                      // A new tab, so the half-filled form stays where it is.
                      <Link
                        to={ROUTES.terms}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground underline underline-offset-4"
                      />
                    ),
                  }}
                />
              </FormLabel>
              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      <Button
        type="submit"
        size="lg"
        className="mt-8 w-full"
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("auth.signUp.submit")}
      </Button>
    </AppForm>
  )
}
