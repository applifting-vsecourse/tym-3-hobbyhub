import { participationRequestsValidationPipe } from '@/modules/participation-request/controllers/participation-requests-validation.pipe';
import {
  PARTICIPATION_CANCELLATION_MESSAGE_MAX_LENGTH,
  PARTICIPATION_CANCELLATION_MESSAGE_MIN_LENGTH,
} from '@/modules/participation-request/domain/participation-request';
import { BadRequestException } from '@nestjs/common';
import { CancelParticipationDto } from './cancel-participation.dto';

// What the endpoint does with a request body before the handler sees it.
const validate = (
  body: Record<string, unknown>,
): Promise<CancelParticipationDto> =>
  participationRequestsValidationPipe.transform(body, {
    type: 'body',
    metatype: CancelParticipationDto,
  }) as Promise<CancelParticipationDto>;

describe('CancelParticipationDto', () => {
  it('requires a message', async () => {
    await expect(validate({})).rejects.toBeInstanceOf(BadRequestException);
    await expect(validate({ message: 42 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('trims the message before counting the minimum', async () => {
    await expect(validate({ message: '  Onemocněl jsem.  ' })).resolves.toEqual(
      { message: 'Onemocněl jsem.' },
    );
    const tooShort = 'x'.repeat(
      PARTICIPATION_CANCELLATION_MESSAGE_MIN_LENGTH - 1,
    );
    await expect(
      validate({ message: `\n ${tooShort} \t` }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('counts characters like the database does', async () => {
    const atMin = '🏐'.repeat(PARTICIPATION_CANCELLATION_MESSAGE_MIN_LENGTH);
    await expect(validate({ message: atMin })).resolves.toEqual({
      message: atMin,
    });
    const atMax = '🏐'.repeat(PARTICIPATION_CANCELLATION_MESSAGE_MAX_LENGTH);
    await expect(validate({ message: atMax })).resolves.toEqual({
      message: atMax,
    });
    await expect(validate({ message: `${atMax}x` })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(['userId', 'cancelledAt'])(
    'refuses %s, which the server decides',
    async (field) => {
      await expect(
        validate({ message: 'Onemocněl jsem.', [field]: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
