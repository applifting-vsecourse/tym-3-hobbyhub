import { PrismaService } from '@/core/prisma/prisma.service';
import { createAdministrator } from '@/shared/admin-auth/create-administrator';
import { AdminAuth } from '@/shared/admin-auth/providers/admin-auth.provider';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { createUser } from './create-user';
import { seedEvents, seedLookups } from './seed-events';
import { seedGroups } from './seed-groups';
import { seedMembershipRequests } from './seed-membership-requests';

export const seedDatabase = async (
  prisma: PrismaService,
  config: Config,
  betterAuth: BetterAuth,
  adminAuth: AdminAuth,
): Promise<void> => {
  const auth = betterAuth;

  // `pnpm dev` runs the seed on every start, so never clobber a database that
  // already has data — that would delete the account and data you just made.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(
      `Database already has ${existingUsers} user(s) — not touching users. ` +
        'Run `pnpm backend db:reset` to wipe and start over.',
    );
    await seedAdministrator(adminAuth, config);
    // Lookups, example events and groups are additive, so an existing database
    // gets them too (they skip themselves when already there).
    await seedLookups(prisma);
    // Databases seeded before #238 still have the old admin as a `User`
    // ("Admin (Delete in Prod)"); it does not take part in example events.
    const users = await prisma.user.findMany({
      where: { email: { not: config.superadminEmail } },
      orderBy: { createdAt: 'asc' },
    });
    await seedEvents(prisma, users);
    await seedGroups(prisma, users);
    await seedMembershipRequests(prisma, users);
    return;
  }

  // Drop existing database data from all tables
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "group_membership", "group", "participation", "event", "activity", "activity_category", "level", "cancellation_reason", "session", "account", "verification", "user", "admin_session", "admin_account", "admin_verification", "administrator" RESTART IDENTITY CASCADE;',
    );
  } catch (error) {
    console.error('Error truncating tables:', error);
  }
  await seedAdministrator(adminAuth, config);

  console.log('Creating example users');

  const caffeinatedDuck = await createUser(prisma, auth, {
    email: 'caffeinatedduck@example.com',
    password: 'password1',
    name: 'Caffeinated Duck',
    username: 'CaffeinatedDuck',
  });

  const deepDuckThoughts = await createUser(prisma, auth, {
    email: 'deepduckthoughts@example.com',
    password: 'password2',
    name: 'Deep Duck Thoughts',
    username: 'DeepDuckThoughts',
  });

  const breadCritic = await createUser(prisma, auth, {
    email: 'breadcritic@example.com',
    password: 'password3',
    name: 'The Bread Critic',
    username: 'BreadCritic',
  });

  const migrationSeason = await createUser(prisma, auth, {
    email: 'migrationseason@example.com',
    password: 'password4',
    name: 'Migration Season',
    username: 'MigrationSeason',
  });

  const pondAdmin = await createUser(prisma, auth, {
    email: 'pondadmin@example.com',
    password: 'password5',
    name: 'Pond Admin',
    username: 'PondAdmin',
  });

  // F-07.3: two newcomers in no group, who ask to join one of
  // CaffeinatedDuck's groups, so member management has something to decide.
  const freshDuckling = await createUser(prisma, auth, {
    email: 'freshduckling@example.com',
    password: 'password6',
    name: 'Fresh Duckling',
    username: 'FreshDuckling',
  });

  const lostGosling = await createUser(prisma, auth, {
    email: 'lostgosling@example.com',
    password: 'password7',
    name: 'Lost Gosling',
    username: 'LostGosling',
  });

  console.log('Creating activities and example events');

  await seedLookups(prisma);
  const exampleUsers = [
    caffeinatedDuck,
    deepDuckThoughts,
    breadCritic,
    migrationSeason,
    pondAdmin,
  ];
  await seedEvents(prisma, exampleUsers);

  console.log('Creating example groups');

  await seedGroups(prisma, exampleUsers);
  await seedMembershipRequests(prisma, [
    ...exampleUsers,
    freshDuckling,
    lostGosling,
  ]);
};

// ADR-0010, #238: the administrator is its own account, not a `User`.
// Skips itself when the address is already there.
const seedAdministrator = async (
  adminAuth: AdminAuth,
  config: Config,
): Promise<void> => {
  const { created } = await createAdministrator(adminAuth, {
    email: config.superadminEmail,
    password: config.superadminPassword,
    name: 'Správce',
  });
  console.log(
    created
      ? `Created administrator ${config.superadminEmail}`
      : `Administrator ${config.superadminEmail} already exists`,
  );
};
