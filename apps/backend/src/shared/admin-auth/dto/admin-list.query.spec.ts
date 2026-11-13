import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { ADMIN_SEARCH_MAX_LENGTH } from '@/shared/admin-auth/domain/administration';
import { BadRequestException } from '@nestjs/common';
import { AdminListQuery } from './admin-list.query';

// What every `/api/admin/*` list does with the query string.
const validate = (query: Record<string, unknown>): Promise<AdminListQuery> =>
  adminValidationPipe.transform(query, {
    type: 'query',
    metatype: AdminListQuery,
  }) as Promise<AdminListQuery>;

describe('AdminListQuery', () => {
  it('starts at the first page without a search', async () => {
    const query = await validate({});
    expect(query.offset).toBe(0);
    expect(query.q).toBeUndefined();
  });

  it('trims the search and reads the offset', async () => {
    await expect(
      validate({ q: '  jana ', offset: '20' }),
    ).resolves.toMatchObject({ q: 'jana', offset: 20 });
  });

  it('treats a blank search as none', async () => {
    expect((await validate({ q: '   ' })).q).toBeUndefined();
  });

  it.each([
    ['a negative offset', { offset: '-1' }],
    ['a long search', { q: 'x'.repeat(ADMIN_SEARCH_MAX_LENGTH + 1) }],
    ['a page size, which the server decides', { limit: '100' }],
  ])('refuses %s', async (_name, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
