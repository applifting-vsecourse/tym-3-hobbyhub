// Limits of the onboarding fields, in step with the backend's
// `modules/onboarding/domain/onboarding.ts`. The server is the one that counts.
export const BIO_MAX_LENGTH = 300
export const CITY_MAX_LENGTH = 100
export const STREET_MAX_LENGTH = 200

export const TRAVEL_RADIUS_MIN_KM = 5
export const TRAVEL_RADIUS_MAX_KM = 100
export const TRAVEL_RADIUS_DEFAULT_KM = 25
export const TRAVEL_RADIUS_STEP_KM = 5

export const SKILL_LEVELS = ["BEGINNER", "ADVANCED", "EXPERT"] as const
export type SkillLevel = (typeof SKILL_LEVELS)[number]

/** The three saving steps; the summary after them is a fourth screen. */
export const ONBOARDING_STEPS = ["ACTIVITIES", "LOCATION", "PROFILE"] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

/** Screens of the wizard: one per step. */
export const SCREEN_COUNT = ONBOARDING_STEPS.length
