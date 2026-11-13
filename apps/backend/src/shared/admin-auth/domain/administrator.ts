// ADR-0010, #238: who is signed in to the administration. Not a `User`: an
// administrator has no profile, events or requests.
export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
};

// Longer than the users' 8: an administrator sees everyone's private data.
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
export const ADMIN_NAME_MAX_LENGTH = 100;

export type AdministratorViolation =
  'EMAIL_INVALID' | 'NAME_REQUIRED' | 'NAME_TOO_LONG' | 'PASSWORD_TOO_SHORT';

// A sanity check on the address, not a full RFC 5322 parse.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const administratorRuleViolations = (input: {
  email: string;
  name: string;
  password: string;
}): AdministratorViolation[] => {
  const violations: AdministratorViolation[] = [];
  if (!EMAIL_PATTERN.test(input.email)) violations.push('EMAIL_INVALID');
  const name = input.name.trim();
  if (name.length === 0) violations.push('NAME_REQUIRED');
  if (name.length > ADMIN_NAME_MAX_LENGTH) violations.push('NAME_TOO_LONG');
  if (input.password.length < ADMIN_PASSWORD_MIN_LENGTH)
    violations.push('PASSWORD_TOO_SHORT');
  return violations;
};
