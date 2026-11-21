import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useTheme } from "@/hooks/useTheme"
import { languageOf, LANGUAGES } from "@/i18n/resources"

import { useSaveLanguage } from "@/features/auth/hooks/useSaveLanguage"
import { useSession } from "@/features/auth/hooks/useSession"

const THEMES = ["light", "dark", "system"] as const

const schema = z.object({
  language: z.enum(LANGUAGES.map(({ code }) => code)),
  theme: z.enum(THEMES),
})

type AppSettingsValues = z.infer<typeof schema>

const isTheme = (value: unknown): value is AppSettingsValues["theme"] =>
  THEMES.some((theme) => theme === value)

/**
 * #262: the language (kept with the account, so it follows the user to every
 * device) and the theme (this device only). Nothing changes until "Uložit":
 * the language is saved first, and if that fails neither of the two is applied.
 */
export function AppSettingsForm() {
  const { t, i18n } = useTranslation()
  const { user } = useSession()
  const { theme, setTheme } = useTheme()
  const saveLanguage = useSaveLanguage()
  const [isSaved, setIsSaved] = useState(false)

  const form = useForm<AppSettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      language: user?.language ?? languageOf(i18n.resolvedLanguage),
      theme: isTheme(theme) ? theme : "system",
    },
  })

  // What was saved becomes the form's new starting point: the unsaved-changes
  // guard asks again about the next change, not only about the first one.
  const { isSubmitSuccessful } = form.formState
  useEffect(() => {
    if (isSubmitSuccessful) form.reset(form.getValues())
  }, [form, isSubmitSuccessful])

  const onSubmit = async (values: AppSettingsValues) => {
    setIsSaved(false)
    if (values.language !== form.formState.defaultValues?.language) {
      await saveLanguage.mutateAsync(values.language)
    }
    setTheme(values.theme)
    setIsSaved(true)
  }

  return (
    <AppForm
      form={form}
      onSubmit={onSubmit}
      onChange={() => setIsSaved(false)}
      className="flex flex-col gap-8"
    >
      {saveLanguage.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{t("settings.saveFailed")}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        control={form.control}
        name="language"
        render={({ field }) => (
          <FormItem className="gap-3">
            <div className="flex flex-col gap-1">
              <FormLabel>{t("settings.language.label")}</FormLabel>
              <FormDescription>{t("settings.language.description")}</FormDescription>
            </div>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                // A <label for> does not name a radiogroup, which is no form control.
                aria-label={t("settings.language.label")}
                className="gap-0"
              >
                {LANGUAGES.map(({ code, label }) => (
                  <Label
                    key={code}
                    lang={code}
                    className="min-h-11 gap-3"
                  >
                    <RadioGroupItem value={code} />
                    {label}
                  </Label>
                ))}
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="theme"
        render={({ field }) => (
          <FormItem className="gap-3">
            <div className="flex flex-col gap-1">
              <FormLabel>{t("settings.theme.label")}</FormLabel>
              <FormDescription>{t("settings.theme.description")}</FormDescription>
            </div>
            <FormControl>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                aria-label={t("settings.theme.label")}
                className="gap-0"
              >
                {THEMES.map((option) => (
                  <Label
                    key={option}
                    className="min-h-11 gap-3"
                  >
                    <RadioGroupItem value={option} />
                    {t(`settings.theme.${option}`)}
                  </Label>
                ))}
              </RadioGroup>
            </FormControl>
          </FormItem>
        )}
      />

      <div className="flex flex-col items-start gap-2">
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("settings.save")}
        </Button>
        {isSaved ? (
          <p
            role="status"
            className="typo-small text-muted-foreground"
          >
            {t("settings.saved")}
          </p>
        ) : null}
      </div>
    </AppForm>
  )
}
