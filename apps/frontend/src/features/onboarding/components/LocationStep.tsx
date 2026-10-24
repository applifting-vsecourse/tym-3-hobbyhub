import { useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import type { TFunction } from "i18next"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useRevalidateOnLanguageChange } from "@/hooks/useRevalidateOnLanguageChange"

import type { Onboarding, SaveLocationInput } from "@/features/onboarding/api/onboardingSchemas"
import {
  OnboardingStepLayout,
  SaveError,
  StepActions,
} from "@/features/onboarding/components/OnboardingStepLayout"
import {
  CITY_MAX_LENGTH,
  STREET_MAX_LENGTH,
  TRAVEL_RADIUS_DEFAULT_KM,
  TRAVEL_RADIUS_MAX_KM,
  TRAVEL_RADIUS_MIN_KM,
  TRAVEL_RADIUS_STEP_KM,
} from "@/features/onboarding/lib/onboardingLimits"

// Built per render so validation messages follow the current language.
const createSchema = (t: TFunction) =>
  z.object({
    city: z
      .string()
      .trim()
      .min(1, t("onboarding.location.validation.cityRequired"))
      .max(
        CITY_MAX_LENGTH,
        t("onboarding.location.validation.cityTooLong", { max: CITY_MAX_LENGTH }),
      ),
    street: z
      .string()
      .trim()
      .max(
        STREET_MAX_LENGTH,
        t("onboarding.location.validation.streetTooLong", { max: STREET_MAX_LENGTH }),
      ),
    travelRadiusKm: z.number().min(TRAVEL_RADIUS_MIN_KM).max(TRAVEL_RADIUS_MAX_KM),
  })

type LocationFormValues = z.infer<ReturnType<typeof createSchema>>

type LocationStepProps = {
  initial: Pick<Onboarding, "city" | "street" | "travelRadiusKm">
  isLast: boolean
  isReturningToEvent: boolean
  isSaving: boolean
  hasSaveError: boolean
  onSubmit: (input: SaveLocationInput) => Promise<void>
  onSkip: () => void
  onSkipAll: () => void
  onBack?: () => void
  shouldFocusHeading?: boolean
}

export function LocationStep({
  initial,
  isLast,
  isReturningToEvent,
  isSaving,
  hasSaveError,
  onSubmit,
  onSkip,
  onSkipAll,
  onBack,
  shouldFocusHeading,
}: LocationStepProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => createSchema(t), [t])
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      city: initial.city ?? "",
      street: initial.street ?? "",
      travelRadiusKm: initial.travelRadiusKm ?? TRAVEL_RADIUS_DEFAULT_KM,
    },
  })
  const [city, street, radius] = useWatch({
    control: form.control,
    name: ["city", "street", "travelRadiusKm"],
  })
  // Nothing typed, nothing saved before and the range left alone: pass the step.
  // A moved range or something to clear is a change, so the button saves.
  const isEmpty =
    city.trim() === "" &&
    street.trim() === "" &&
    !initial.city &&
    !initial.street &&
    radius === (initial.travelRadiusKm ?? TRAVEL_RADIUS_DEFAULT_KM)

  useRevalidateOnLanguageChange(form)

  const submit = async (values: LocationFormValues) =>
    onSubmit({
      city: values.city,
      street: values.street || undefined,
      travelRadiusKm: values.travelRadiusKm,
    })

  return (
    <OnboardingStepLayout
      screen={2}
      title={t("onboarding.location.title")}
      description={t("onboarding.location.description")}
      onSkipAll={onSkipAll}
      isBusy={isSaving}
      shouldFocusHeading={shouldFocusHeading}
    >
      <AppForm
        form={form}
        onSubmit={submit}
        isGuarded={false}
        className="flex flex-col gap-6"
      >
        <SaveError isVisible={hasSaveError} />

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("onboarding.location.city")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="address-level2"
                  placeholder={t("onboarding.location.cityPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("onboarding.location.street")}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="street-address"
                  placeholder={t("onboarding.location.streetPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="travelRadiusKm"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-baseline justify-between gap-3">
                <FormLabel>{t("onboarding.location.radius")}</FormLabel>
                <span className="typo-label-lg text-foreground">
                  {t("onboarding.location.radiusValue", { km: field.value })}
                </span>
              </div>
              <FormControl>
                <Slider
                  aria-label={t("onboarding.location.radius")}
                  min={TRAVEL_RADIUS_MIN_KM}
                  max={TRAVEL_RADIUS_MAX_KM}
                  step={TRAVEL_RADIUS_STEP_KM}
                  value={[field.value]}
                  onValueChange={([value]) => field.onChange(value)}
                />
              </FormControl>
              <div className="flex justify-between typo-small text-muted-foreground">
                <span>{t("onboarding.location.radiusValue", { km: TRAVEL_RADIUS_MIN_KM })}</span>
                <span>{t("onboarding.location.radiusValue", { km: TRAVEL_RADIUS_MAX_KM })}</span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <StepActions
          isSaving={isSaving}
          isEmpty={isEmpty}
          isLast={isLast}
          isReturningToEvent={isReturningToEvent}
          onSkip={onSkip}
          onBack={onBack}
        />
      </AppForm>
    </OnboardingStepLayout>
  )
}
