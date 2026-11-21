import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';
import { consentsAtSignUp, Gender, Language } from './registration';

/** How long a Google account that still has to sign up may take to do it. */
export const PENDING_TTL_MS = 10 * 60 * 1000;

/**
 * What the Google round trip told us about someone who has no account here
 * yet. It travels to the sign-up page as an encrypted token, so the page can
 * finish the sign-up without sending the visitor to Google a second time.
 */
export type PendingGoogleUser = {
  email: string;
  name: string;
  image: string | null;
  expiresAt: number;
};

type GoogleUser = {
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean | null;
};

/**
 * Seals the Google user into a token only this server can open: encrypted and
 * authenticated with the auth secret, valid for PENDING_TTL_MS. Refuses (null)
 * an e-mail Google did not verify: no account may be made for it.
 */
export async function sealPendingGoogleUser(
  secret: string,
  user: GoogleUser,
  now: Date,
): Promise<string | null> {
  if (user.emailVerified !== true) return null;
  const pending: PendingGoogleUser = {
    email: user.email,
    name: user.name ?? '',
    image: user.image ?? null,
    expiresAt: now.getTime() + PENDING_TTL_MS,
  };
  return symmetricEncrypt({ key: secret, data: JSON.stringify(pending) });
}

/** Opens a token from `sealPendingGoogleUser`; null if forged, broken or old. */
export async function openPendingGoogleUser(
  secret: string,
  token: string,
  now: Date,
): Promise<PendingGoogleUser | null> {
  if (!token) return null;
  try {
    const pending = JSON.parse(
      await symmetricDecrypt({ key: secret, data: token }),
    ) as Partial<PendingGoogleUser>;
    if (
      typeof pending.email !== 'string' ||
      typeof pending.expiresAt !== 'number' ||
      pending.expiresAt < now.getTime()
    ) {
      return null;
    }
    return {
      email: pending.email,
      name: typeof pending.name === 'string' ? pending.name : '',
      image: typeof pending.image === 'string' ? pending.image : null,
      expiresAt: pending.expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * The columns of the account made for a Google user who has filled in the
 * registration: the nickname they typed is the public name (#212, ADR-0025),
 * Google vouches for the e-mail, and the consents are recorded now.
 */
export function googleUserRecord(
  pending: PendingGoogleUser,
  registration: {
    username: string;
    gender: Gender;
    birthYear: number;
    preferredLanguage: Language;
  },
  image: string | null,
  now: Date,
): Record<string, unknown> {
  return {
    email: pending.email,
    emailVerified: true,
    image,
    name: registration.username,
    username: registration.username.toLowerCase(),
    displayUsername: registration.username,
    gender: registration.gender,
    birthYear: registration.birthYear,
    preferredLanguage: registration.preferredLanguage,
    ...consentsAtSignUp(now),
  };
}
