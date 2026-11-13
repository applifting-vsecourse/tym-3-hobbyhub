import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';

// #238: everything under `/api/admin/*` is for administrators only. Every
// controller in the codebase whose path starts with `admin` must carry
// `AdministratorGuard` on the class, so a new admin route cannot forget it.
const controllerFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(path);
    return entry.name.endsWith('.controller.ts') ? [path] : [];
  });

const adminControllers = controllerFiles(join(__dirname, '../..'))
  .flatMap((file) =>
    // A dynamic import would make the `it.each` below async; jest loads
    // these synchronously anyway.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Object.values(require(file) as Record<string, unknown>),
  )
  .filter(
    (value): value is new (...args: never[]) => unknown =>
      typeof value === 'function' &&
      String(Reflect.getMetadata(PATH_METADATA, value) ?? '').startsWith(
        'admin',
      ),
  );

describe('admin routes', () => {
  it('finds the admin controllers', () => {
    expect(adminControllers.map((c) => c.name).sort()).toEqual([
      'AdminEventsController',
      'AdminGroupsController',
      'AdminMembershipRequestsController',
      'AdminUserEventsController',
      'AdminUsersController',
      'AdministratorsController',
    ]);
  });

  it.each(adminControllers.map((c) => [c.name, c]))(
    '%s is guarded by AdministratorGuard',
    (_name, controller) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
      expect(guards).toContain(AdministratorGuard);
    },
  );
});
