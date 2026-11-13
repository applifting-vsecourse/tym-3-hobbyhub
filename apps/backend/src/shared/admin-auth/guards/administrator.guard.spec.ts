import { AdminAuth } from '@/shared/admin-auth/providers/admin-auth.provider';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AdministratorGuard } from './administrator.guard';

const contextFor = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const adminAuthWith = (session: unknown): AdminAuth =>
  ({ api: { getSession: jest.fn().mockResolvedValue(session) } }) as never;

describe('AdministratorGuard', () => {
  it('refuses a request without an admin session', async () => {
    const guard = new AdministratorGuard(adminAuthWith(null));

    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('puts the admin session apart from the user one', async () => {
    const session = { user: { id: 'a1', email: 'a@example.com', name: 'A' } };
    const request: Record<string, unknown> = { headers: {} };
    const guard = new AdministratorGuard(adminAuthWith(session));

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.adminSession).toBe(session);
    expect(request.session).toBeUndefined();
  });
});
