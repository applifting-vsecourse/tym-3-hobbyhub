import { participationRequestsValidationPipe } from '@/modules/participation-request/controllers/participation-requests-validation.pipe';
import { PARTICIPATION_REQUEST_REJECTION_REASON_MAX_LENGTH } from '@/modules/participation-request/domain/participation-request';
import { BadRequestException } from '@nestjs/common';
import { RejectParticipationRequestDto } from './reject-participation-request.dto';

// What the endpoint does with a request body before the handler sees it.
const validate = (
  body: Record<string, unknown>,
): Promise<RejectParticipationRequestDto> =>
  participationRequestsValidationPipe.transform(body, {
    type: 'body',
    metatype: RejectParticipationRequestDto,
  }) as Promise<RejectParticipationRequestDto>;

describe('RejectParticipationRequestDto', () => {
  it('accepts no reason at all', async () => {
    await expect(validate({})).resolves.toEqual({});
  });

  it('trims the reason and drops a blank one', async () => {
    await expect(validate({ reason: '  Plno  ' })).resolves.toEqual({
      reason: 'Plno',
    });
    await expect(validate({ reason: '\n\t ' })).resolves.toEqual({
      reason: undefined,
    });
  });

  it('counts characters like the database does', async () => {
    const atLimit = '🏐'.repeat(
      PARTICIPATION_REQUEST_REJECTION_REASON_MAX_LENGTH,
    );
    await expect(validate({ reason: atLimit })).resolves.toEqual({
      reason: atLimit,
    });
    await expect(validate({ reason: `${atLimit}x` })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(['status', 'decidedAt'])(
    'refuses %s, which the server decides',
    async (field) => {
      await expect(validate({ [field]: 'x' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
});
