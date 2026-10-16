import { useId, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm, type DefaultValues } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { z } from "zod"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

import { BirthDatePicker } from "@/features/auth/components/BirthDatePicker"
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
      password: z.string().trim().min(8, t("auth.validation.passwordMin")),
      passwordConfirmation: z
        .string()
        .trim()
        .min(1, t("auth.validation.passwordConfirmationRequired")),
      gender: z.enum(GENDERS, { message: t("auth.validation.genderRequired") }),
      birthDate: z
        .string()
        .min(1, t("auth.validation.birthDateRequired"))
        .refine((value) => isAdult(value, new Date()), t("auth.validation.underage")),
      termsAccepted: z.boolean().refine(Boolean, t("auth.validation.termsRequired")),
    })
    .refine((values) => values.password === values.passwordConfirmation, {
      message: t("auth.validation.passwordsMustMatch"),
      path: ["passwordConfirmation"],
    })

export type SignUpFormValues = z.infer<ReturnType<typeof createSchema>>

// Gender has no default: the user picks one.
const defaultValues: DefaultValues<SignUpFormValues> = {
  name: "",
  email: "",
  password: "",
  passwordConfirmation: "",
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
  const genderLabelId = useId()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  useRevalidateOnLanguageChange(form)

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

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel id={genderLabelId}>{t("auth.fields.gender")}</FormLabel>
              <FormControl>
                <RadioGroup
                  aria-labelledby={genderLabelId}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  className="flex gap-6"
                >
                  {GENDERS.map((gender) => (
                    <FormItem
                      key={gender}
                      className="flex h-11 items-center gap-2 md:h-9"
                    >
                      <FormControl>
                        <RadioGroupItem value={gender} />
                      </FormControl>
                      <FormLabel className="typo-body">{t(GENDER_LABELS[gender])}</FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
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
          name="termsAccepted"
          render={({ field }) => (
            <FormItem>
              <div className="flex min-h-11 items-center gap-3 md:min-h-9">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel className="typo-body">
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
                          className="font-medium underline underline-offset-4"
                        />
                      ),
                    }}
                  />
                </FormLabel>
              </div>
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
