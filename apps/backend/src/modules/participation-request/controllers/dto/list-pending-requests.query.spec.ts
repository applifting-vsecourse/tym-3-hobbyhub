import { participationRequestsValidationPipe } from '@/modules/participation-request/controllers/participation-requests-validation.pipe';
import {
  PENDING_REQUESTS_DEFAULT_LIMIT,
  PENDING_REQUESTS_MAX_LIMIT,
} from '@/modules/participation-request/domain/participation-request';
import { BadRequestException } from '@nestjs/common';
import { ListPendingRequestsQuery } from './list-pending-requests.query';

// Query parameters arrive as strings.
const validate = (
  query: Record<string, string>,
): Promise<ListPendingRequestsQuery> =>
  participationRequestsValidationPipe.transform(query, {
    type: 'query',
    metatype: ListPendingRequestsQuery,
  }) as Promise<ListPendingRequestsQuery>;

describe('ListPendingRequestsQuery', () => {
  it('starts at the first page by default', async () => {
    await expect(validate({})).resolves.toEqual({
      limit: PENDING_REQUESTS_DEFAULT_LIMIT,
      offset: 0,
    });
  });

  it('reads the page from the query', async () => {
    await expect(validate({ limit: '10', offset: '20' })).resolves.toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it.each([
    ['a limit of 0', { limit: '0' }],
    [
      'a limit over the maximum',
      { limit: String(PENDING_REQUESTS_MAX_LIMIT + 1) },
    ],
    ['a negative offset', { offset: '-1' }],
    ['a limit that is not a number', { limit: 'abc' }],
  ])('refuses %s', async (_, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
