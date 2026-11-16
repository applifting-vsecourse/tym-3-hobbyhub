// ADR-0010, #238: the administrator's sign-in is a separate account and a
// separate session. Against a real PostgreSQL, on request like the schema specs:
//   DB_TESTS=1 pnpm backend test admin-auth
import 'dotenv/config';
import { PrismaService } from '@/core/prisma/prisma.service';
import { createAdministrator } from '@/shared/admin-auth/create-administrator';
import {
  ADMIN_AUTH_BASE_PATH,
  createAdminAuth,
} from '@/shared/admin-auth/providers/admin-auth.provider';
import { betterAuthCoreConfig } from '@/shared/auth/config/better-auth.config';
import { Config } from '@/shared/config/config.service';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb('admin auth', () => {
  const prisma = new PrismaService();
  const config = {
    backendUrl: 'http://localhost:3000',
    frontendUrl: 'http://localhost:5173',
  } as Config;
  const adminAuth = createAdminAuth(prisma, config);
  // The users' instance with what touches the database, like `auth:generate`.
  const userAuth = betterAuth({
    ...betterAuthCoreConfig,
    baseURL: config.backendUrl,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
  });
  const random = (): string => Math.random().toString(36).slice(2);
  const password = 'correct-horse-battery';
  const emails: string[] = [];

  // The sign-in limit (5 in 15 minutes) is real here too, and kept in the
  // database between runs.
  beforeEach(async () => {
    await prisma.adminRateLimit.deleteMany({
      where: { key: { contains: '/sign-in/email' } },
    });
  });

  afterAll(async () => {
    await prisma.administrator.deleteMany({ where: { email: { in: emails } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  const anEmail = (): string => {
    const email = `admin-test-${random()}@example.com`;
    emails.push(email);
    return email;
  };

  // Through the HTTP handler, as the browser does, to get the real cookie.
  const signInAsAdministrator = async (email: string): Promise<string> => {
    const response = await adminAuth.handler(
      new Request(`${config.backendUrl}${ADMIN_AUTH_BASE_PATH}/sign-in/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: config.frontendUrl,
        },
        body: JSON.stringify({ email, password }),
      }),
    );
    expect(response.status).toBe(200);
    return response.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
  };

  it('creates an administrator without a User row and signs in with the admin cookie', async () => {
    const email = anEmail();
    const { created } = await createAdministrator(adminAuth, {
      email,
      name: 'Test',
      password,
    });
    expect(created).toBe(true);
    expect(await prisma.user.count({ where: { email } })).toBe(0);

    const cookie = await signInAsAdministrator(email);
    expect(cookie).toContain('hobbyhub-admin.session_token=');

    const adminSession = await adminAuth.api.getSession({
      headers: new Headers({ cookie }),
    });
    expect(adminSession?.user.email).toBe(email);
  });

  it('leaves an existing administrator unchanged', async () => {
    const email = anEmail();
    await createAdministrator(adminAuth, { email, name: 'První', password });

    const again = await createAdministrator(adminAuth, {
      email,
      name: 'Druhý',
      password: 'another-long-password',
    });

    expect(again).toMatchObject({
      created: false,
      administrator: { name: 'První' },
    });
    await signInAsAdministrator(email);
  });

  it('refuses a weak password', async () => {
    await expect(
      createAdministrator(adminAuth, {
        email: anEmail(),
        name: 'Test',
        password: 'short',
      }),
    ).rejects.toThrow('PASSWORD_TOO_SHORT');
  });

  it('keeps the two sessions apart', async () => {
    const adminEmail = anEmail();
    await createAdministrator(adminAuth, {
      email: adminEmail,
      name: 'A',
      password,
    });
    const adminCookie = await signInAsAdministrator(adminEmail);

    const userEmail = anEmail();
    const { headers } = await userAuth.api.signUpEmail({
      body: { email: userEmail, password, name: 'U' },
      returnHeaders: true,
    });
    const userCookie = headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');

    expect(
      await userAuth.api.getSession({
        headers: new Headers({ cookie: adminCookie }),
      }),
    ).toBeNull();
    expect(
      await adminAuth.api.getSession({
        headers: new Headers({ cookie: userCookie }),
      }),
    ).toBeNull();
  });

  it('does not let anyone sign up as an administrator', async () => {
    const email = anEmail();
    const response = await adminAuth.handler(
      new Request(`${config.backendUrl}${ADMIN_AUTH_BASE_PATH}/sign-up/email`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: config.frontendUrl,
        },
        body: JSON.stringify({ email, password, name: 'X' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await prisma.administrator.count({ where: { email } })).toBe(0);
  });
});
