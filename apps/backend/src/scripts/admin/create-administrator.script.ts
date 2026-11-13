import { parseArgs } from 'node:util';
import { AdminAuthModule } from '@/shared/admin-auth/admin-auth.module';
import { createAdministrator } from '@/shared/admin-auth/create-administrator';
import {
  ADMIN_AUTH,
  AdminAuth,
} from '@/shared/admin-auth/providers/admin-auth.provider';
import { NestFactory } from '@nestjs/core';

// ADR-0010, #238: creates an administrator account.
//
//   ADMIN_PASSWORD='…' pnpm backend admin:create --email jana@example.com --name "Jana"
//   ADMIN_PASSWORD='…' pnpm admin:create:prod --email … --name …   (in the container)
//
// The password comes from the environment, not an argument, so it stays out
// of the shell history and the process list. An existing address is left
// untouched.
const USAGE =
  "Usage: ADMIN_PASSWORD='…' admin:create --email <e-mail> --name <name>";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
    },
  });
  const password = process.env.ADMIN_PASSWORD;
  if (!values.email || !values.name || !password) {
    console.error(USAGE);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AdminAuthModule, {
    logger: ['error', 'warn'],
  });
  try {
    const adminAuth = app.get<AdminAuth>(ADMIN_AUTH);
    const { created, administrator } = await createAdministrator(adminAuth, {
      email: values.email,
      name: values.name,
      password,
    });
    console.log(
      created
        ? `Created administrator ${administrator.email}.`
        : `Administrator ${administrator.email} already exists, left unchanged.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
