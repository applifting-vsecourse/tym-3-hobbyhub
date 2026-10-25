import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { AppForm } from "@/components/form/AppForm"
import { AddressSearch } from "@/components/hobbyhub/AddressSearch"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Slider } from "@/components/ui/slider"
import { hasAddressSuggestions, type AddressSuggestion } from "@/lib/addressSuggestions"

import type { Onboarding, SaveLocationInput } from "@/features/onboarding/api/onboardingSchemas"
import {
  OnboardingStepLayout,
  SaveError,
  StepActions,
} from "@/features/onboarding/components/OnboardingStepLayout"
import {
  TRAVEL_RADIUS_DEFAULT_KM,
  TRAVEL_RADIUS_MAX_KM,
  TRAVEL_RADIUS_MIN_KM,
  TRAVEL_RADIUS_STEP_KM,
} from "@/features/onboarding/lib/onboardingLimits"

const schema = z.object({
  // Picked from the suggestions; nothing picked means the step is skipped.
  address: z
    .object({
      label: z.string(),
      street: z.string(),
      city: z.string(),
      postalCode: z.string(),
      country: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    })
    .nullable(),
  travelRadiusKm: z.number().min(TRAVEL_RADIUS_MIN_KM).max(TRAVEL_RADIUS_MAX_KM),
})

type LocationFormValues = z.infer<typeof schema>

// The saved address as the picker shows it: the same one line the suggestions use.
const savedAddress = (address: Onboarding["address"]): AddressSuggestion | null =>
  address && {
    ...address,
    label: `${address.street}, ${address.postalCode} ${address.city}, ${address.country}`,
  }

type LocationStepProps = {
  initial: Pick<Onboarding, "address" | "travelRadiusKm">
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
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      address: savedAddress(initial.address),
      travelRadiusKm: initial.travelRadiusKm ?? TRAVEL_RADIUS_DEFAULT_KM,
    },
  })
  const address = useWatch({ control: form.control, name: "address" })
  // No address picked and none saved before: the way on passes the step, even
  // when the range was moved; a range alone is not a location.
  const isEmpty = address === null

  // Whatever was half-done is dropped, so leaving does not ask about it.
  const leaveWith = (action: () => void) => () => {
    form.reset()
    action()
  }

  const submit = async ({ address, travelRadiusKm }: LocationFormValues) => {
    if (!address) return onSkip()
    return onSubmit({
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      travelRadiusKm,
    })
  }

  return (
    <OnboardingStepLayout
      screen={2}
      title={t("onboarding.location.title")}
      description={t("onboarding.location.description")}
      onSkipAll={leaveWith(onSkipAll)}
      isBusy={isSaving}
      shouldFocusHeading={shouldFocusHeading}
    >
      <AppForm
        form={form}
        onSubmit={submit}
        className="flex flex-col gap-6"
      >
        <SaveError isVisible={hasSaveError} />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("onboarding.location.address")}</FormLabel>
              {hasAddressSuggestions() ? (
                <>
                  <FormControl>
                    <AddressSearch
                      value={field.value?.label ?? ""}
                      placeholder={t("onboarding.location.addressPlaceholder")}
                      onSelect={(selected) =>
                        field.onChange(selected, { shouldDirty: true, shouldTouch: true })
                      }
                    />
                  </FormControl>
                  <p className="typo-small text-muted-foreground">
                    {t("onboarding.location.addressHint")}
                  </p>
                </>
              ) : (
                <p className="typo-small text-muted-foreground">
                  {t("onboarding.location.addressUnavailable")}
                </p>
              )}
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
          onSkip={leaveWith(onSkip)}
          onBack={onBack}
        />
      </AppForm>
    </OnboardingStepLayout>
  )
}
