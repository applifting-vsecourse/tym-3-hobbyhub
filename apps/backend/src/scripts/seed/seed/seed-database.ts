import { PrismaService } from '@/core/prisma/prisma.service';
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
    // Lookups, example events and groups are additive, so an existing database
    // gets them too (they skip themselves when already there).
    await seedLookups(prisma);
    // Administrators run the platform, they do not take part in events.
    const users = await prisma.user.findMany({
      where: { role: 'user' },
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
      'TRUNCATE TABLE "group_membership", "group", "participation", "event", "activity", "activity_category", "level", "cancellation_reason", "session", "account", "verification", "user" RESTART IDENTITY CASCADE;',
    );
  } catch (error) {
    console.error('Error truncating tables:', error);
  }

  console.log('Creating superadmin user');

  // Create a superadmin user. This should be delete in prod app
  await createUser(prisma, auth, {
    email: config.superadminEmail,
    password: config.superadminPassword,
    username: 'superadmin',
    role: 'admin',
  });

  console.log('Creating example users');

  const caffeinatedDuck = await createUser(prisma, auth, {
    email: 'caffeinatedduck@example.com',
    password: 'password1',
    username: 'CaffeinatedDuck',
  });

  const deepDuckThoughts = await createUser(prisma, auth, {
    email: 'deepduckthoughts@example.com',
    password: 'password2',
    username: 'DeepDuckThoughts',
  });

  const breadCritic = await createUser(prisma, auth, {
    email: 'breadcritic@example.com',
    password: 'password3',
    username: 'BreadCritic',
  });

  const migrationSeason = await createUser(prisma, auth, {
    email: 'migrationseason@example.com',
    password: 'password4',
    username: 'MigrationSeason',
  });

  const pondAdmin = await createUser(prisma, auth, {
    email: 'pondadmin@example.com',
    password: 'password5',
    username: 'PondAdmin',
  });

  // F-07.3: two newcomers in no group, who ask to join one of
  // CaffeinatedDuck's groups, so member management has something to decide.
  const freshDuckling = await createUser(prisma, auth, {
    email: 'freshduckling@example.com',
    password: 'password6',
    username: 'FreshDuckling',
  });

  const lostGosling = await createUser(prisma, auth, {
    email: 'lostgosling@example.com',
    password: 'password7',
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
