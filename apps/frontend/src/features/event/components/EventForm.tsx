import { useId, useMemo, useState, type ComponentProps, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { ChevronLeft, Loader2 } from "lucide-react"
import { useForm, useFormContext, useWatch, type FieldErrors } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { ActivityCombobox } from "@/components/hobbyhub/ActivityCombobox"
import { Counter } from "@/components/hobbyhub/Counter"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/useMediaQuery"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"
import { cn } from "@/lib/utils"

import {
  CREATABLE_VENUE_TYPES,
  EVENT_LIMITS,
  type CreateEventInput,
} from "@/features/event/api/eventSchemas"
import { EventPreview } from "@/features/event/components/EventPreview"
import { combineDateTime } from "@/features/event/lib/eventDateTime"

// Characters as the server and database count them: an emoji is one, not the
// two UTF-16 units of `string.length`.
const charCount = (value: string) => [...value].length

// Crowns with at most two decimals, typed with a dot or a comma.
const AMOUNT_PATTERN = /^\d{1,8}([.,]\d{1,2})?$/

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction, now: () => Date) => {
  const text = (max: number) =>
    z
      .string()
      .trim()
      .refine((value) => charCount(value) <= max, t("events.validation.tooLong", { count: max }))
  const required = (max: number, message: string) =>
    text(max).refine((value) => value.length > 0, message)
  const people = z.number().int().min(0).max(EVENT_LIMITS.participantsLimit)

  return (
    z
      .object({
        activityId: z.string().min(1, t("events.validation.activityRequired")),
        title: text(EVENT_LIMITS.titleMax)
          .refine((value) => value.length > 0, t("events.validation.titleRequired"))
          .refine(
            (value) => value.length === 0 || charCount(value) >= EVENT_LIMITS.titleMin,
            t("events.validation.titleTooShort", { count: EVENT_LIMITS.titleMin }),
          ),
        startDate: z.string().min(1, t("events.validation.dateRequired")),
        startTime: z.string().min(1, t("events.validation.timeRequired")),
        endDate: z.string().min(1, t("events.validation.dateRequired")),
        endTime: z.string().min(1, t("events.validation.timeRequired")),
        street: required(EVENT_LIMITS.streetMax, t("events.validation.streetRequired")),
        city: required(EVENT_LIMITS.cityMax, t("events.validation.cityRequired")),
        postalCode: required(EVENT_LIMITS.postalCodeMax, t("events.validation.postalCodeRequired")),
        country: required(EVENT_LIMITS.countryMax, t("events.validation.countryRequired")),
        placeName: text(EVENT_LIMITS.placeNameMax),
        minParticipants: people.min(1),
        maxParticipants: people.min(1),
        externalOccupiedSpots: people,
        contributionAmount: z
          .string()
          .trim()
          .refine(
            (value) => value === "" || AMOUNT_PATTERN.test(value),
            t("events.validation.amountInvalid"),
          ),
        contributionNote: text(EVENT_LIMITS.contributionNoteMax),
        description: required(
          EVENT_LIMITS.descriptionMax,
          t("events.validation.descriptionRequired"),
        ),
        equipment: text(EVENT_LIMITS.equipmentMax),
        venueType: z.enum(CREATABLE_VENUE_TYPES),
      })
      // Rules between fields. Each lands on the field the organizer has to change.
      .superRefine((values, ctx) => {
        const start = combineDateTime(values.startDate, values.startTime)
        const end = combineDateTime(values.endDate, values.endTime)
        if (start && start.getTime() <= now().getTime()) {
          ctx.addIssue({
            code: "custom",
            path: ["startTime"],
            message: t("events.validation.startInPast"),
          })
        }
        if (start && end && end.getTime() <= start.getTime()) {
          ctx.addIssue({
            code: "custom",
            path: ["endTime"],
            message: t("events.validation.endBeforeStart"),
          })
        }
        if (values.minParticipants > values.maxParticipants) {
          ctx.addIssue({
            code: "custom",
            path: ["maxParticipants"],
            message: t("events.validation.maxBelowMin"),
          })
        }
        if (values.externalOccupiedSpots > values.maxParticipants) {
          ctx.addIssue({
            code: "custom",
            path: ["externalOccupiedSpots"],
            message: t("events.validation.occupiedAboveMax"),
          })
        }
        if (values.contributionNote.length > 0 && values.contributionAmount === "") {
          ctx.addIssue({
            code: "custom",
            path: ["contributionAmount"],
            message: t("events.validation.amountRequiredForNote"),
          })
        }
      })
  )
}

type FormValues = z.input<ReturnType<typeof createSchema>>

// Before an activity is picked; its defaults replace these.
const defaultValues = (t: TFunction): FormValues => ({
  activityId: "",
  title: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  street: "",
  city: "",
  postalCode: "",
  country: t("events.defaults.country"),
  placeName: "",
  minParticipants: 2,
  maxParticipants: 4,
  externalOccupiedSpots: 0,
  contributionAmount: "",
  contributionNote: "",
  description: "",
  equipment: "",
  venueType: "PUBLIC_VENUE",
})

// Optional fields left empty are not sent at all. Dates are validated by then.
const toInput = (values: FormValues): CreateEventInput => {
  const start = combineDateTime(values.startDate, values.startTime)
  const end = combineDateTime(values.endDate, values.endTime)
  if (!start || !end) throw new Error("EventForm: submitted without a valid date")

  return {
    title: values.title.trim(),
    activityId: values.activityId,
    description: values.description.trim(),
    equipment: values.equipment.trim() || undefined,
    venueType: values.venueType,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    location: {
      street: values.street.trim(),
      city: values.city.trim(),
      postalCode: values.postalCode.trim(),
      country: values.country.trim(),
      placeName: values.placeName.trim() || undefined,
    },
    minParticipants: values.minParticipants,
    maxParticipants: values.maxParticipants,
    externalOccupiedSpots: values.externalOccupiedSpots,
    contributionAmount:
      values.contributionAmount.trim() === ""
        ? undefined
        : Number(values.contributionAmount.trim().replace(",", ".")),
    contributionNote: values.contributionNote.trim() || undefined,
  }
}

const STEPS = ["what", "who", "details"] as const
type Step = (typeof STEPS)[number]

// Which fields each step of the phone wizard checks before moving on.
const STEP_FIELDS: Record<Step, (keyof FormValues)[]> = {
  what: [
    "activityId",
    "title",
    "startDate",
    "startTime",
    "endDate",
    "endTime",
    "street",
    "city",
    "postalCode",
    "country",
    "placeName",
  ],
  who: [
    "minParticipants",
    "maxParticipants",
    "externalOccupiedSpots",
    "contributionAmount",
    "contributionNote",
  ],
  details: ["description", "equipment", "venueType"],
}

export type ActivityOption = {
  id: string
  label: string
  icon: string
  /** Usual size of a game, prefilled when the activity is picked. */
  defaultMinParticipants: number
  defaultMaxParticipants: number
}

type EventFormProps = {
  /** Already translated; the form sorts them by label. */
  readonly activities: ActivityOption[]
  readonly isActivitiesLoading: boolean
  readonly isActivitiesError: boolean
  readonly onRetryActivities: () => void
  readonly isSubmitting: boolean
  readonly errorMessage?: string | null
  readonly onSubmit: (values: CreateEventInput) => void | Promise<void>
  /** Round back button of the first phone step (a link to the previous page). */
  readonly backLink?: ReactNode
  /** "Zrušit" of the desktop sidebar (a link to the previous page). */
  readonly cancelAction?: ReactNode
  /** Overridable for tests. */
  readonly now?: () => Date
}

const realNow = () => new Date()

export function EventForm({
  activities,
  isActivitiesLoading,
  isActivitiesError,
  onRetryActivities,
  isSubmitting,
  errorMessage,
  onSubmit,
  backLink,
  cancelAction,
  now = realNow,
}: EventFormProps) {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const schema = useMemo(() => createSchema(t, now), [t, now])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(t),
  })
  useRevalidateOnLanguageChange(form)
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex] ?? "what"
  const isLastStep = stepIndex === STEPS.length - 1

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => a.label.localeCompare(b.label)),
    [activities],
  )

  const goToStep = (index: number) => {
    setStepIndex(index)
    window.scrollTo({ top: 0 })
  }

  const goNext = async () => {
    if (await form.trigger(STEP_FIELDS[step])) goToStep(stepIndex + 1)
  }

  // A rule broken on an earlier step (the start slipped into the past while
  // typing) must be shown, not hidden behind the last step.
  const showFirstBrokenStep = (errors: FieldErrors<FormValues>) => {
    if (isDesktop) return
    const firstBrokenStep = STEPS.findIndex((candidate) =>
      STEP_FIELDS[candidate].some((field) => field in errors),
    )
    if (firstBrokenStep >= 0 && firstBrokenStep !== stepIndex) goToStep(firstBrokenStep)
  }

  const activityProps = {
    activities: sortedActivities,
    isActivitiesLoading,
    isActivitiesError,
    onRetryActivities,
  }

  const error = errorMessage ? (
    <Alert variant="destructive">
      <AlertDescription>{errorMessage}</AlertDescription>
    </Alert>
  ) : null

  return (
    <AppForm
      form={form}
      onSubmit={(values) => onSubmit(toInput(values))}
      onInvalid={showFirstBrokenStep}
      // Enter on a phone step moves on; only the last step publishes.
      onBeforeSubmit={() => {
        if (isDesktop || isLastStep) return false
        void goNext()
        return true
      }}
    >
      {isDesktop ? (
        <div>
          <h1 className="typo-h1 text-foreground">{t("events.form.title")}</h1>
          <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
            <div className="space-y-8">
              {error}
              {STEPS.map((section, index) => (
                <section
                  key={section}
                  aria-labelledby={`event-section-${section}`}
                >
                  {index > 0 ? <Separator className="mb-8" /> : null}
                  <h2
                    id={`event-section-${section}`}
                    className="typo-h3 text-foreground"
                  >
                    {[index + 1, t(`events.form.steps.${section}`)].join(" · ")}
                  </h2>
                  <div className="mt-4 space-y-4">
                    <StepFields
                      step={section}
                      {...activityProps}
                    />
                  </div>
                </section>
              ))}
            </div>
            <aside className="space-y-4 md:sticky md:top-20">
              <PreviewFromForm activities={sortedActivities} />
              <MissingToMinimum />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("events.form.publish")}
              </Button>
              {cancelAction}
            </aside>
          </div>
        </div>
      ) : (
        // Room for the action bar fixed to the bottom. A fixed value is enough:
        // the bar grows by the BottomNav's height, and the sticky nav takes
        // that same height in the flow below this content.
        <div className="pb-24">
          {stepIndex === 0 ? (
            backLink
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mb-4 rounded-full"
              aria-label={t("events.form.previousStep")}
              onClick={() => goToStep(stepIndex - 1)}
            >
              <ChevronLeft aria-hidden />
            </Button>
          )}
          <p className="typo-caption text-muted-foreground">
            {[
              t("events.form.stepOf", { step: stepIndex + 1, total: STEPS.length }),
              t(`events.form.steps.${step}`),
            ].join(" · ")}
          </p>
          <div
            aria-hidden
            className="mt-2 flex gap-2"
          >
            {STEPS.map((candidate, index) => (
              <span
                key={candidate}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  index <= stepIndex ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <h1 className="mt-4 typo-h1 text-foreground">{t("events.form.title")}</h1>
          <div className="mt-6 space-y-4">
            {error}
            <StepFields
              step={step}
              {...activityProps}
            />
            {step === "who" ? <MissingToMinimum /> : null}
            {step === "details" ? <PreviewFromForm activities={sortedActivities} /> : null}
          </div>
          {/* Under the BottomNav (z-40), so its raised "Přidat" stays on top. */}
          <div className="fixed inset-x-0 bottom-0 z-30 bg-background px-4 pt-3 pb-above-bottom-nav">
            {/*
              Distinct keys, so the two buttons never share a DOM node. The step
              changes while the click on "Pokračovat" is still being handled;
              with one node React would flip its type to "submit" before the
              browser runs the click's default action, and the form would be
              submitted behind the organizer's back.
            */}
            {isLastStep ? (
              <Button
                key="publish"
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("events.form.publish")}
              </Button>
            ) : (
              <Button
                key="continue"
                type="button"
                size="lg"
                className="w-full"
                onClick={() => void goNext()}
              >
                {t("events.form.continue")}
              </Button>
            )}
          </div>
        </div>
      )}
    </AppForm>
  )
}

type ActivityFieldProps = {
  readonly activities: ActivityOption[]
  readonly isActivitiesLoading: boolean
  readonly isActivitiesError: boolean
  readonly onRetryActivities: () => void
}

function StepFields({ step, ...activityProps }: ActivityFieldProps & { readonly step: Step }) {
  switch (step) {
    case "what":
      return <WhatFields {...activityProps} />
    case "who":
      return <WhoFields />
    case "details":
      return <DetailsFields />
  }
}

function WhatFields({
  activities,
  isActivitiesLoading,
  isActivitiesError,
  onRetryActivities,
}: ActivityFieldProps) {
  const { t } = useTranslation()
  const form = useFormContext<FormValues>()

  const activityPlaceholder = isActivitiesLoading
    ? t("events.form.activityLoading")
    : activities.length === 0 && !isActivitiesError
      ? t("events.form.activityEmpty")
      : t("events.form.activityPlaceholder")

  // The usual size of a game is a starting point, overwritten on every change
  // of activity; the organizer adjusts it on the next step.
  const prefillParticipants = (activityId: string) => {
    const activity = activities.find((candidate) => candidate.id === activityId)
    if (!activity) return
    form.setValue("minParticipants", activity.defaultMinParticipants, { shouldDirty: true })
    form.setValue("maxParticipants", activity.defaultMaxParticipants, { shouldDirty: true })
  }

  // Most events end the day they start: the end date follows until it is set later.
  const followStartDate = (startDate: string) => {
    const endDate = form.getValues("endDate")
    if (!endDate || endDate < startDate) form.setValue("endDate", startDate)
  }

  return (
    <>
      <FormField
        control={form.control}
        name="activityId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("events.fields.activity")}</FormLabel>
            <FormControl>
              <ActivityCombobox
                ref={field.ref}
                name={field.name}
                options={activities}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  prefillParticipants(value)
                }}
                onBlur={field.onBlur}
                placeholder={activityPlaceholder}
                disabled={isActivitiesLoading || activities.length === 0}
              />
            </FormControl>
            {isActivitiesError ? (
              <div className="flex items-center justify-between gap-3">
                <p className="typo-small text-destructive-ink">{t("events.form.activityError")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetryActivities}
                >
                  {t("events.form.retry")}
                </Button>
              </div>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      <TextField
        name="title"
        label={t("events.fields.title")}
        placeholder={t("events.placeholders.title")}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("events.fields.startDate")}</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    followStartDate(event.target.value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <TextField
          name="startTime"
          type="time"
          label={t("events.fields.startTime")}
        />
        <TextField
          name="endDate"
          type="date"
          label={t("events.fields.endDate")}
        />
        <TextField
          name="endTime"
          type="time"
          label={t("events.fields.endTime")}
        />
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-3 typo-label-lg text-foreground">{t("events.form.address")}</legend>
        <TextField
          name="street"
          label={t("events.fields.street")}
          placeholder={t("events.placeholders.street")}
          autoComplete="street-address"
        />
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
          <TextField
            name="city"
            label={t("events.fields.city")}
            placeholder={t("events.placeholders.city")}
            autoComplete="address-level2"
          />
          <TextField
            name="postalCode"
            label={t("events.fields.postalCode")}
            placeholder={t("events.placeholders.postalCode")}
            autoComplete="postal-code"
          />
        </div>
        <TextField
          name="country"
          label={t("events.fields.country")}
          autoComplete="country-name"
        />
        <TextField
          name="placeName"
          label={t("events.fields.placeName")}
          placeholder={t("events.placeholders.placeName")}
        />
      </fieldset>
    </>
  )
}

function WhoFields() {
  const { t } = useTranslation()
  const form = useFormContext<FormValues>()
  const maxParticipants = useWatch({ control: form.control, name: "maxParticipants" })

  return (
    <>
      <CounterField
        name="minParticipants"
        label={t("events.fields.minParticipants")}
        min={1}
      />
      <CounterField
        name="maxParticipants"
        label={t("events.fields.maxParticipants")}
        min={1}
      />
      <CounterField
        name="externalOccupiedSpots"
        label={t("events.fields.externalOccupiedSpots")}
        min={0}
        // Lowering the maximum afterwards is caught by validation instead.
        max={Math.max(maxParticipants, 0)}
        description={t("events.form.externalHint")}
      />
      <TextField
        name="contributionAmount"
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        label={t("events.fields.contributionAmount")}
        placeholder={t("events.placeholders.contributionAmount")}
        description={t("events.form.contributionHint")}
      />
      <TextField
        name="contributionNote"
        label={t("events.fields.contributionNote")}
        placeholder={t("events.placeholders.contributionNote")}
      />
    </>
  )
}

function DetailsFields() {
  const { t } = useTranslation()
  const form = useFormContext<FormValues>()
  const venueTypeLabelId = useId()

  return (
    <>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("events.fields.description")}</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder={t("events.placeholders.description")}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField
        name="equipment"
        label={t("events.fields.equipment")}
        placeholder={t("events.placeholders.equipment")}
      />
      <FormField
        control={form.control}
        name="venueType"
        render={({ field }) => (
          <FormItem>
            <p
              id={venueTypeLabelId}
              className="typo-label-lg text-foreground"
            >
              {t("events.fields.venueType")}
            </p>
            <ToggleGroup
              type="single"
              variant="chip"
              spacing={2}
              aria-labelledby={venueTypeLabelId}
              value={field.value}
              // Radix clears the value on a second tap; one type is always chosen.
              onValueChange={(value) => {
                if (value) field.onChange(value)
              }}
              className="flex-wrap"
            >
              {CREATABLE_VENUE_TYPES.map((venueType) => (
                <ToggleGroupItem
                  key={venueType}
                  value={venueType}
                  className="h-11 px-4 md:h-9"
                >
                  {t(`events.venueType.${venueType}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

/** "Chybí 4 do minima" — how many people the organizer is looking for. */
function MissingToMinimum() {
  const { t } = useTranslation()
  const { control } = useFormContext<FormValues>()
  const [minParticipants, externalOccupiedSpots] = useWatch({
    control,
    name: ["minParticipants", "externalOccupiedSpots"],
  })
  const missing = Math.max(minParticipants - externalOccupiedSpots, 0)

  return (
    <div
      role="status"
      className="rounded-lg bg-accent px-4 py-3"
    >
      <p className="typo-label-lg text-accent-foreground">
        {missing > 0
          ? t("events.form.missingToMinimum", { count: missing })
          : t("events.form.minimumReached")}
      </p>
      <p className="mt-1 typo-small text-accent-foreground">{t("events.form.missingHint")}</p>
    </div>
  )
}

function PreviewFromForm({ activities }: { readonly activities: ActivityOption[] }) {
  const { control } = useFormContext<FormValues>()
  const [
    activityId,
    title,
    startDate,
    startTime,
    placeName,
    city,
    minParticipants,
    maxParticipants,
    externalOccupiedSpots,
  ] = useWatch({
    control,
    name: [
      "activityId",
      "title",
      "startDate",
      "startTime",
      "placeName",
      "city",
      "minParticipants",
      "maxParticipants",
      "externalOccupiedSpots",
    ],
  })
  const activity = activities.find((candidate) => candidate.id === activityId)

  return (
    <EventPreview
      activityIcon={activity?.icon ?? ""}
      title={title.trim()}
      start={combineDateTime(startDate, startTime)}
      place={placeName.trim() || city.trim()}
      taken={externalOccupiedSpots}
      min={minParticipants}
      max={maxParticipants}
    />
  )
}

type TextFieldProps = Omit<ComponentProps<typeof Input>, "name"> & {
  readonly name: keyof FormValues
  readonly label: string
  readonly description?: string
}

function TextField({ name, label, description, ...inputProps }: TextFieldProps) {
  const { control } = useFormContext<FormValues>()

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...inputProps}
              {...field}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

type CounterFieldProps = {
  readonly name: "minParticipants" | "maxParticipants" | "externalOccupiedSpots"
  readonly label: string
  readonly min: number
  readonly max?: number
  readonly description?: string
}

function CounterField({ name, label, min, max, description }: CounterFieldProps) {
  const { control } = useFormContext<FormValues>()

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Counter
            label={label}
            value={field.value}
            onValueChange={field.onChange}
            min={min}
            max={max ?? EVENT_LIMITS.participantsLimit}
          />
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
