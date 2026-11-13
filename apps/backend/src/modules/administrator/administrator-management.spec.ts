// #237, ADR-0021: administrators invite, deactivate and reactivate each other,
// against a real PostgreSQL and BetterAuth's own endpoints. On request:
//   DB_TESTS=1 pnpm backend test administrator-management
import 'dotenv/config';
import { OutgoingEmail } from '@/core/email/outbox/email-delivery';
import { EmailOutbox } from '@/core/email/outbox/email-outbox.interface';
import { PrismaService } from '@/core/prisma/prisma.service';
import { AdminInvitations } from '@/shared/admin-auth/admin-invitations';
import { createAdministrator } from '@/shared/admin-auth/create-administrator';
import {
  ADMIN_AUTH_BASE_PATH,
  createAdminAuth,
} from '@/shared/admin-auth/providers/admin-auth.provider';
import { Config } from '@/shared/config/config.service';
import { AdministratorRepository } from './repositories/administrator.repository';
import { AdministratorsService } from './services/administrators.service';

// React Email imports dynamically, which jest cannot; the e-mail carries its
// props instead, the link among them.
jest.mock('@/core/email/render', () => ({
  renderEmail: (_component: unknown, props: object): Promise<string> =>
    Promise.resolve(JSON.stringify(props)),
}));

const describeDb = process.env.DB_TESTS ? describe : describe.skip;

describeDb('administrator management', () => {
  const prisma = new PrismaService();
  const config = {
    backendUrl: 'http://localhost:3000',
    frontendUrl: 'http://localhost:5173',
  } as Config;
  const sent: OutgoingEmail[] = [];
  const outbox: EmailOutbox = {
    enqueue: (emails) => {
      sent.push(...emails);
      return Promise.resolve();
    },
  };
  const adminAuth = createAdminAuth(prisma, config, outbox);
  const service = new AdministratorsService(
    new AdministratorRepository(prisma),
    new AdminInvitations(adminAuth, config, outbox),
  );
  const random = (): string => Math.random().toString(36).slice(2);
  const password = 'correct-horse-battery';
  const emails: string[] = [];

  beforeEach(async () => {
    sent.length = 0;
    await prisma.adminRateLimit.deleteMany({});
  });

  afterAll(async () => {
    // deactivatedBy is RESTRICT: undo the deactivations before deleting.
    await prisma.administrator.updateMany({
      where: { email: { in: emails } },
      data: { deactivatedAt: null, deactivatedById: null },
    });
    await prisma.administrator.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  const anEmail = (): string => {
    const email = `admin-mgmt-${random()}@example.com`;
    emails.push(email);
    return email;
  };

  const post = (
    path: string,
    body: unknown,
    cookie?: string,
  ): Promise<Response> =>
    adminAuth.handler(
      new Request(`${config.backendUrl}${ADMIN_AUTH_BASE_PATH}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: config.frontendUrl,
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(body),
      }),
    );

  const signIn = async (
    email: string,
    withPassword = password,
  ): Promise<Response> =>
    post('/sign-in/email', { email, password: withPassword });

  const cookieOf = (response: Response): string =>
    response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ');

  const tokenFrom = (email: OutgoingEmail | undefined): string => {
    const match = email?.html.match(/token=([A-Za-z0-9_-]+)/);
    if (!match?.[1]) throw new Error('No link in the e-mail');
    return match[1];
  };

  const setPassword = (
    token: string,
    newPassword = password,
  ): Promise<Response> => post('/reset-password', { token, newPassword });

  const anActiveAdministrator = async (): Promise<{
    id: string;
    email: string;
    name: string;
  }> => {
    const { administrator } = await createAdministrator(adminAuth, {
      email: anEmail(),
      name: 'Aktivní',
      password,
    });
    return administrator;
  };

  it('invites by e-mail; the link sets the password and the admin signs in', async () => {
    const actor = await anActiveAdministrator();
    const email = anEmail();

    const invited = await service.invite(actor, { email, name: 'Nový' });

    expect(invited).toMatchObject({
      status: 'INVITED',
      createdBy: { id: actor.id },
    });
    expect(sent).toEqual([
      expect.objectContaining({
        kind: 'ADMIN_INVITATION',
        critical: true,
        administratorId: invited.id,
        to: email,
      }),
    ]);
    expect((await signIn(email)).status).toBe(401);

    expect((await setPassword(tokenFrom(sent[0]))).status).toBe(200);

    expect((await signIn(email)).status).toBe(200);
    await expect(
      service
        .listAdministrators()
        .then((all) => all.find((a) => a.id === invited.id)),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  it('sends the invitation again and the old link stops working', async () => {
    const actor = await anActiveAdministrator();
    const invited = await service.invite(actor, {
      email: anEmail(),
      name: 'Nový',
    });
    const oldToken = tokenFrom(sent[0]);

    await service.resendInvitation(invited.id);
    const newToken = tokenFrom(sent[1]);

    expect((await setPassword(oldToken)).status).toBe(400);
    expect((await setPassword(newToken)).status).toBe(200);
  });

  it('deactivates: the sessions end, the sign-in answers like a wrong password, no reset link', async () => {
    const actor = await anActiveAdministrator();
    const colleague = await anActiveAdministrator();
    const signedIn = await signIn(colleague.email);
    const cookie = cookieOf(signedIn);

    await expect(
      service.deactivate(actor, colleague.id),
    ).resolves.toMatchObject({
      status: 'DEACTIVATED',
      deactivatedBy: { id: actor.id },
    });

    await expect(
      adminAuth.api.getSession({ headers: new Headers({ cookie }) }),
    ).resolves.toBeNull();
    const refused = await signIn(colleague.email);
    const wrongPassword = await signIn(actor.email, 'not-the-password');
    expect(refused.status).toBe(wrongPassword.status);
    await expect(refused.json()).resolves.toMatchObject({
      code: 'INVALID_EMAIL_OR_PASSWORD',
    });

    sent.length = 0;
    expect(
      (await post('/request-password-reset', { email: colleague.email }))
        .status,
    ).toBe(200);
    expect(sent).toEqual([]);
  });

  it('reactivates without the old password, through a new invitation', async () => {
    const actor = await anActiveAdministrator();
    const colleague = await anActiveAdministrator();
    await service.deactivate(actor, colleague.id);
    sent.length = 0;

    await expect(service.reactivate(colleague.id)).resolves.toMatchObject({
      status: 'INVITED',
      deactivatedAt: null,
    });

    expect((await signIn(colleague.email)).status).toBe(401);
    expect(
      (await setPassword(tokenFrom(sent[0]), 'a-brand-new-password')).status,
    ).toBe(200);
    expect((await signIn(colleague.email, 'a-brand-new-password')).status).toBe(
      200,
    );
  });

  it('e-mails an active administrator a link for a forgotten password', async () => {
    const administrator = await anActiveAdministrator();

    expect(
      (await post('/request-password-reset', { email: administrator.email }))
        .status,
    ).toBe(200);

    expect(sent).toEqual([
      expect.objectContaining({
        kind: 'RESET_PASSWORD',
        administratorId: administrator.id,
      }),
    ]);
    expect(
      (await setPassword(tokenFrom(sent[0]), 'another-long-password')).status,
    ).toBe(200);
    expect(
      (await signIn(administrator.email, 'another-long-password')).status,
    ).toBe(200);
  });

  it('refuses in the database to have a deactivation without its author', async () => {
    const administrator = await anActiveAdministrator();

    await expect(
      prisma.administrator.update({
        where: { id: administrator.id },
        data: { deactivatedAt: new Date() },
      }),
    ).rejects.toThrow(/administrator_deactivation_all_or_nothing/);
  });
});
