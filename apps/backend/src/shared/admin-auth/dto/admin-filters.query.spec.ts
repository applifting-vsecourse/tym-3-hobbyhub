import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { AdminEventsQuery } from './admin-events.query';
import { AdminUsersQuery } from './admin-users.query';

const validate = <T>(
  metatype: new () => T,
  query: Record<string, unknown>,
): Promise<T> =>
  adminValidationPipe.transform(query, {
    type: 'query',
    metatype,
  }) as Promise<T>;

describe('smart filters of the administration lists (#271)', () => {
  it('takes the filters of the users', async () => {
    for (const filter of ['blocked', 'restricted', 'unverified']) {
      expect((await validate(AdminUsersQuery, { filter })).filter).toBe(filter);
    }
  });

  it('takes the states of an event and the hidden mark', async () => {
    for (const filter of ['DRAFT', 'PUBLISHED', 'CANCELLED', 'hidden']) {
      expect((await validate(AdminEventsQuery, { filter })).filter).toBe(
        filter,
      );
    }
  });

  it('reads a blank filter as none', async () => {
    expect(
      (await validate(AdminUsersQuery, { filter: '' })).filter,
    ).toBeUndefined();
    expect(
      (await validate(AdminEventsQuery, { filter: '' })).filter,
    ).toBeUndefined();
  });

  it('refuses a filter the list does not have', async () => {
    await expect(
      validate(AdminUsersQuery, { filter: 'PUBLISHED' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      validate(AdminEventsQuery, { filter: 'blocked' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
