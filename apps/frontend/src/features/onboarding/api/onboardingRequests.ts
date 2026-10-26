import { api } from "@/lib/api-client"

import { onboardingSchema } from "@/features/onboarding/api/onboardingSchemas"
import type {
  SaveActivitiesInput,
  SaveLocationInput,
  SaveProfileInput,
} from "@/features/onboarding/api/onboardingSchemas"
import type { OnboardingStep } from "@/features/onboarding/lib/onboardingLimits"

export const getOnboarding = async () => onboardingSchema.parse(await api.get("onboarding").json())

export const saveActivities = async (input: SaveActivitiesInput) =>
  onboardingSchema.parse(await api.put("onboarding/activities", { json: input }).json())

export const saveLocation = async (input: SaveLocationInput) =>
  onboardingSchema.parse(await api.put("onboarding/location", { json: input }).json())

export const saveProfile = async (input: SaveProfileInput) =>
  onboardingSchema.parse(await api.put("onboarding/profile", { json: input }).json())

export const skipStep = async (step: OnboardingStep) =>
  onboardingSchema.parse(await api.post(`onboarding/steps/${step}/skip`).json())

export const finishOnboarding = async () =>
  onboardingSchema.parse(await api.post("onboarding/finish").json())

export const skipOnboarding = async () =>
  onboardingSchema.parse(await api.post("onboarding/skip").json())
