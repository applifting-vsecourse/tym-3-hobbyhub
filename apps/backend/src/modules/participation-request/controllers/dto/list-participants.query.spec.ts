import { participationRequestsValidationPipe } from '@/modules/participation-request/controllers/participation-requests-validation.pipe';
import { PENDING_REQUESTS_DEFAULT_LIMIT } from '@/modules/participation-request/domain/participation-request';
import { BadRequestException } from '@nestjs/common';
import { ListParticipantsQuery } from './list-participants.query';

// Query parameters arrive as strings.
const validate = (
  query: Record<string, string>,
): Promise<ListParticipantsQuery> =>
  participationRequestsValidationPipe.transform(query, {
    type: 'query',
    metatype: ListParticipantsQuery,
  }) as Promise<ListParticipantsQuery>;

describe('ListParticipantsQuery', () => {
  it.each(['APPROVED', 'CANCELLED'])(
    'takes the state %s with the first page by default',
    async (status) => {
      await expect(validate({ status })).resolves.toEqual({
        status,
        limit: PENDING_REQUESTS_DEFAULT_LIMIT,
        offset: 0,
      });
    },
  );

  it.each([
    ['no state', {}],
    ['a state of a request', { status: 'REJECTED' }],
    ['a state without a feature yet', { status: 'WAITLISTED' }],
    ['a limit of 0', { status: 'APPROVED', limit: '0' }],
  ])('refuses %s', async (_, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
