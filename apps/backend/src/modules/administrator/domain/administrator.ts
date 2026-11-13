// #238, ADR-0010, ADR-0021: an administrator as the administration manages
// them.

export type AdministratorStatus = 'INVITED' | 'ACTIVE' | 'DEACTIVATED';

export type AdministratorRef = { id: string; name: string };

export type AdministratorListItem = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  status: AdministratorStatus;
  createdBy: AdministratorRef | null;
  deactivatedAt: Date | null;
  deactivatedBy: AdministratorRef | null;
};

/**
 * ADR-0021: deactivated wins; otherwise invited until they set a password.
 * Stored is only what makes it up, never the status itself.
 */
export const administratorStatusOf = (facts: {
  hasPassword: boolean;
  deactivatedAt: Date | null;
}): AdministratorStatus => {
  if (facts.deactivatedAt) return 'DEACTIVATED';
  return facts.hasPassword ? 'ACTIVE' : 'INVITED';
};

export const ADMINISTRATOR_NAME_MAX_LENGTH = 100;
export const ADMINISTRATOR_EMAIL_MAX_LENGTH = 320;

/** The address an administrator signs in with: compared case-insensitively. */
export const normalizeAdministratorEmail = (email: string): string =>
  email.trim().toLowerCase();

export type InvitationViolation =
  'ALREADY_ADMINISTRATOR' | 'DEACTIVATED_ADMINISTRATOR';

/**
 * A new invitation: the address must not be an administrator yet. A
 * deactivated one gets their access back instead, which also invites them.
 */
export const invitationViolations = (
  existing: { status: AdministratorStatus } | null,
): InvitationViolation[] => {
  if (!existing) return [];
  return existing.status === 'DEACTIVATED'
    ? ['DEACTIVATED_ADMINISTRATOR']
    : ['ALREADY_ADMINISTRATOR'];
};

export type ResendViolation = 'NOT_INVITED';

/** Only someone still invited gets the invitation again. */
export const resendViolations = (target: {
  status: AdministratorStatus;
}): ResendViolation[] => (target.status === 'INVITED' ? [] : ['NOT_INVITED']);

export type DeactivationViolation =
  'SELF' | 'ALREADY_DEACTIVATED' | 'LAST_ACTIVE';

/**
 * ADR-0021: nobody removes themselves, and the last active administrator
 * stays (an invited one does not count: they cannot sign in yet).
 */
export const deactivationViolations = (
  target: { id: string; status: AdministratorStatus },
  actorId: string,
  activeCount: number,
): DeactivationViolation[] => {
  const violations: DeactivationViolation[] = [];
  if (target.id === actorId) violations.push('SELF');
  if (target.status === 'DEACTIVATED') violations.push('ALREADY_DEACTIVATED');
  if (target.status === 'ACTIVE' && activeCount <= 1) {
    violations.push('LAST_ACTIVE');
  }
  return violations;
};

export type ReactivationViolation = 'NOT_DEACTIVATED';

export const reactivationViolations = (target: {
  status: AdministratorStatus;
}): ReactivationViolation[] =>
  target.status === 'DEACTIVATED' ? [] : ['NOT_DEACTIVATED'];
