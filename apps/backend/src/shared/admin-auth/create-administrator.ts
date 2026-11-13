import {
  AdminIdentity,
  administratorRuleViolations,
} from '@/shared/admin-auth/domain/administrator';
import { AdminAuth } from '@/shared/admin-auth/providers/admin-auth.provider';

export type CreateAdministratorResult =
  | { created: true; administrator: AdminIdentity }
  | { created: false; administrator: AdminIdentity };

// The one way an administrator comes to be (the seed and `admin:create`):
// sign-up is off on the admin instance, so this writes the account through
// BetterAuth's own adapter and password hashing, the way its admin plugin
// does. An existing address is left as it is, password included.
export const createAdministrator = async (
  adminAuth: AdminAuth,
  input: { email: string; name: string; password: string },
): Promise<CreateAdministratorResult> => {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const violations = administratorRuleViolations({ ...input, email, name });
  if (violations.length > 0) {
    throw new Error(`Cannot create administrator: ${violations.join(', ')}`);
  }

  const ctx = await adminAuth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    const { id, name: existingName } = existing.user;
    return {
      created: false,
      administrator: { id, email, name: existingName },
    };
  }

  const user = await ctx.internalAdapter.createUser(
    {
      email,
      name,
      // Nobody can prove the address yet; the account is made by hand.
      emailVerified: false,
    },
    { method: 'admin' },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(input.password),
  });

  return { created: true, administrator: { id: user.id, email, name } };
};
