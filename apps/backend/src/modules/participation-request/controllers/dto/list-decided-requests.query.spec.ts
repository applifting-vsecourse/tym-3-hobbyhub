import { participationRequestsValidationPipe } from '@/modules/participation-request/controllers/participation-requests-validation.pipe';
import { PENDING_REQUESTS_DEFAULT_LIMIT } from '@/modules/participation-request/domain/participation-request';
import { BadRequestException } from '@nestjs/common';
import { ListDecidedRequestsQuery } from './list-decided-requests.query';

// Query parameters arrive as strings.
const validate = (
  query: Record<string, string>,
): Promise<ListDecidedRequestsQuery> =>
  participationRequestsValidationPipe.transform(query, {
    type: 'query',
    metatype: ListDecidedRequestsQuery,
  }) as Promise<ListDecidedRequestsQuery>;

describe('ListDecidedRequestsQuery', () => {
  it.each(['REJECTED', 'WITHDRAWN'])(
    'takes the state %s with the first page by default',
    async (status) => {
      await expect(validate({ status })).resolves.toEqual({
        status,
        limit: PENDING_REQUESTS_DEFAULT_LIMIT,
        offset: 0,
      });
    },
  );

  it('reads the page from the query', async () => {
    await expect(
      validate({ status: 'REJECTED', limit: '10', offset: '20' }),
    ).resolves.toEqual({ status: 'REJECTED', limit: 10, offset: 20 });
  });

  it.each([
    ['no state', {}],
    ['a waiting state', { status: 'PENDING' }],
    ['a closed state', { status: 'CLOSED' }],
    // F-05.6: an approved request is a participant, on the other list.
    ['the approved state', { status: 'APPROVED' }],
    ['a limit of 0', { status: 'REJECTED', limit: '0' }],
  ])('refuses %s', async (_, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
