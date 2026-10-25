import { Activity } from '@/modules/activity/domain/activity';
import { Level } from '@/modules/level/domain/level';

export const ONBOARDING_BIO_MAX_LENGTH = 300;
export const ONBOARDING_STREET_MAX_LENGTH = 200;
export const ONBOARDING_CITY_MAX_LENGTH = 100;
export const ONBOARDING_POSTAL_CODE_MAX_LENGTH = 20;
export const ONBOARDING_COUNTRY_MAX_LENGTH = 100;

export const TRAVEL_RADIUS_MIN_KM = 5;
export const TRAVEL_RADIUS_MAX_KM = 100;
export const TRAVEL_RADIUS_DEFAULT_KM = 25;

// The steps the user can save or skip, in order. The summary that follows is
// not a step: it saves nothing.
export const ONBOARDING_STEPS = ['ACTIVITIES', 'LOCATION', 'PROFILE'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

export type Interest = {
  activity: Activity;
  level: Level | null;
};

export type InterestInput = {
  activityId: string;
  levelId: string | null;
};

// The home address as picked from the address suggestions: all of it, with the
// position (user_home_location_all_or_nothing).
export type HomeAddress = {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
};

export type Onboarding = {
  // How many steps are done or skipped. An interrupted wizard resumes at the
  // step after the last one done.
  stepsDone: number;
  // The wizard ended but the profile is not set up (see isProfileSetUp), so the
  // profile still asks to be finished. Worked out when read, never stored.
  skipped: boolean;
  // Set when the wizard ended, finished or skipped (ADR-0011).
  completedAt: Date | null;
  interests: Interest[];
  address: HomeAddress | null;
  travelRadiusKm: number | null;
  bio: string | null;
};

export type OnboardingViolation = 'NO_ACTIVITY' | 'DUPLICATE_ACTIVITY';

/** Rules for the picked activities; the codes are never thrown from here. */
export function interestViolations(
  items: readonly InterestInput[],
): OnboardingViolation[] {
  const violations: OnboardingViolation[] = [];
  if (items.length === 0) violations.push('NO_ACTIVITY');
  if (new Set(items.map((item) => item.activityId)).size !== items.length) {
    violations.push('DUPLICATE_ACTIVITY');
  }
  return violations;
}

/** 1-based position of a step in the wizard. */
export const stepNumber = (step: OnboardingStep): number =>
  ONBOARDING_STEPS.indexOf(step) + 1;

/**
 * The profile asks no more to be finished once there are activities and a
 * location; the bio and the photo are optional.
 */
export const isProfileSetUp = (
  onboarding: Pick<Onboarding, 'interests' | 'address'>,
): boolean => onboarding.interests.length > 0 && onboarding.address !== null;
