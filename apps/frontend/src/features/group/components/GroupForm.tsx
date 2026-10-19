import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { ActivityCombobox } from "@/components/hobbyhub/ActivityCombobox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

import { GROUP_LIMITS, type CreateGroupInput } from "@/features/group/api/groupSchemas"

// Characters as the server and database count them: an emoji is one, not the
// two UTF-16 units of `string.length`.
const charCount = (value: string) => [...value].length

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) => {
  const text = (max: number) =>
    z
      .string()
      .trim()
      .refine((value) => charCount(value) <= max, t("groups.validation.tooLong", { count: max }))

  return z.object({
    name: text(GROUP_LIMITS.nameMax)
      .refine((value) => value.length > 0, t("groups.validation.nameRequired"))
      .refine(
        (value) => value.length === 0 || charCount(value) >= GROUP_LIMITS.nameMin,
        t("groups.validation.nameTooShort", { count: GROUP_LIMITS.nameMin }),
      ),
    activityId: z.string().min(1, t("groups.validation.activityRequired")),
    locationName: text(GROUP_LIMITS.locationMax),
    usualSchedule: text(GROUP_LIMITS.scheduleMax),
    description: text(GROUP_LIMITS.descriptionMax).min(
      1,
      t("groups.validation.descriptionRequired"),
    ),
  })
}

type FormValues = z.infer<ReturnType<typeof createSchema>>

const defaultValues: FormValues = {
  name: "",
  activityId: "",
  locationName: "",
  usualSchedule: "",
  description: "",
}

// Optional fields left empty are not sent at all.
const toInput = ({ locationName, usualSchedule, ...values }: FormValues): CreateGroupInput => ({
  ...values,
  locationName: locationName || undefined,
  usualSchedule: usualSchedule || undefined,
})

export type ActivityOption = {
  id: string
  label: string
  icon: string
}

type GroupFormProps = {
  /** Already translated; the form sorts them by label. */
  readonly activities: ActivityOption[]
  readonly isActivitiesLoading: boolean
  readonly isActivitiesError: boolean
  readonly onRetryActivities: () => void
  readonly isSubmitting: boolean
  readonly errorMessage?: string | null
  readonly onSubmit: (values: CreateGroupInput) => void | Promise<void>
}

export function GroupForm({
  activities,
  isActivitiesLoading,
  isActivitiesError,
  onRetryActivities,
  isSubmitting,
  errorMessage,
  onSubmit,
}: GroupFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  useRevalidateOnLanguageChange(form)

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => a.label.localeCompare(b.label)),
    [activities],
  )

  const activityPlaceholder = isActivitiesLoading
    ? t("groups.form.activityLoading")
    : sortedActivities.length === 0 && !isActivitiesError
      ? t("groups.form.activityEmpty")
      : t("groups.form.activityPlaceholder")

  return (
    <AppForm
      form={form}
      onSubmit={(values) => onSubmit(toInput(values))}
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
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("groups.fields.name")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t("groups.placeholders.name")}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="activityId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("groups.fields.activity")}</FormLabel>
            <FormControl>
              <ActivityCombobox
                ref={field.ref}
                name={field.name}
                options={sortedActivities}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={activityPlaceholder}
                disabled={isActivitiesLoading || sortedActivities.length === 0}
              />
            </FormControl>
            {isActivitiesError ? (
              <div className="flex items-center justify-between gap-3">
                <p className="typo-small text-destructive-ink">{t("groups.form.activityError")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetryActivities}
                >
                  {t("groups.form.retry")}
                </Button>
              </div>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="locationName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("groups.fields.location")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t("groups.placeholders.location")}
                autoComplete="address-level2"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="usualSchedule"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("groups.fields.usualSchedule")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t("groups.placeholders.usualSchedule")}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("groups.fields.description")}</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder={t("groups.placeholders.description")}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* On phones the action sits at the bottom of the screen, as in the wireframe. */}
      <div className="fixed inset-x-0 bottom-0 bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:mt-8 md:flex md:justify-end md:p-0">
        <Button
          type="submit"
          size="lg"
          className="w-full md:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("groups.form.submit")}
        </Button>
      </div>
    </AppForm>
  )
}
