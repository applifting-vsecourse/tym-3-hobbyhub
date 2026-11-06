import { Interest } from '@/modules/onboarding/domain/onboarding';
import {
  ageOn,
  Gender,
  GENDERS,
  MIN_AGE,
  parseBirthDate,
} from '@/shared/auth/registration/registration';

export const PROFILE_NAME_MAX_LENGTH = 50;
export const PROFILE_BIO_MAX_LENGTH = 300;

// The photo is converted to WebP in the browser and stored as a data URL in
// `user.image`; the limit counts the picture itself, not its base64 text.
export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_IMAGE_PREFIX = 'data:image/webp;base64,';

// A picture can also be one of the app's own illustrations, stored as
// "avatar:<name>"; a cover is the id of one of the app's covers. The server
// checks the shape only: the pictures themselves live in the frontend, which
// shows the default for a name it does not know.
const NAME_PATTERN = /^[a-z0-9-]{1,40}$/;
export const PROFILE_AVATAR_PREFIX = 'avatar:';

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const OLDEST_BIRTH_YEAR = 1900;

export type HomeLocation = {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
};

/** What the signed-in user sees on their own profile. */
export type Profile = {
  name: string;
  joinedAt: Date;
  bio: string | null;
  image: string | null;
  cover: string | null;
  // Private: used for statistics and age checks, never shown to others.
  gender: Gender | null;
  birthDate: string | null;
  interests: Interest[];
  address: HomeLocation | null;
  travelRadiusKm: number | null;
};

/**
 * What another signed-in person sees (F-04.2): no gender, birth date or
 * address. The e-mail is there only for the organizer of an event the person
 * is approved on; everyone else gets null.
 */
export type PublicProfile = {
  id: string;
  name: string;
  joinedAt: Date;
  bio: string | null;
  image: string | null;
  cover: string | null;
  interests: Interest[];
};

export type ProfileViolation =
  | 'IMAGE_FORMAT'
  | 'IMAGE_TOO_LARGE'
  | 'INVALID_GENDER'
  | 'INVALID_BIRTH_DATE'
  | 'UNDERAGE';

/** Rules for the cover: one of the app's covers, or the user's own WebP picture. */
export function coverViolations(cover: string): ProfileViolation[] {
  if (NAME_PATTERN.test(cover)) return [];
  return cover.startsWith(PROFILE_AVATAR_PREFIX)
    ? ['IMAGE_FORMAT']
    : imageViolations(cover);
}

/** Rules for the picture: an illustration of the app or a WebP data URL. */
export function imageViolations(image: string): ProfileViolation[] {
  if (image.startsWith(PROFILE_AVATAR_PREFIX)) {
    return NAME_PATTERN.test(image.slice(PROFILE_AVATAR_PREFIX.length))
      ? []
      : ['IMAGE_FORMAT'];
  }
  if (!image.startsWith(PROFILE_IMAGE_PREFIX)) return ['IMAGE_FORMAT'];
  const payload = image.slice(PROFILE_IMAGE_PREFIX.length);
  if (!BASE64_PATTERN.test(payload)) return ['IMAGE_FORMAT'];
  return Buffer.from(payload, 'base64').length > PROFILE_IMAGE_MAX_BYTES
    ? ['IMAGE_TOO_LARGE']
    : [];
}

/** The same gender and birth date rules as registration (F-03.1). */
export function privateDetailsViolations(
  gender: unknown,
  birthDate: unknown,
  today: Date,
): ProfileViolation[] {
  const violations: ProfileViolation[] = [];
  if (!GENDERS.includes(gender as Gender)) violations.push('INVALID_GENDER');
  const date = parseBirthDate(birthDate);
  if (!date || date > today || date.getUTCFullYear() < OLDEST_BIRTH_YEAR) {
    violations.push('INVALID_BIRTH_DATE');
  } else if (ageOn(date, today) < MIN_AGE) {
    violations.push('UNDERAGE');
  }
  return violations;
}
