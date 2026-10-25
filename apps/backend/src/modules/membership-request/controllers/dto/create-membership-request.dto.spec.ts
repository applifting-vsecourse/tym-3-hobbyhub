import { membershipRequestsValidationPipe } from '@/modules/membership-request/controllers/membership-requests-validation.pipe';
import { MEMBERSHIP_REQUEST_MESSAGE_MAX_LENGTH } from '@/modules/membership-request/domain/membership-request';
import { BadRequestException } from '@nestjs/common';
import { CreateMembershipRequestDto } from './create-membership-request.dto';

// What the endpoint does with a request body before the handler sees it.
const validate = (
  body: Record<string, unknown>,
): Promise<CreateMembershipRequestDto> =>
  membershipRequestsValidationPipe.transform(body, {
    type: 'body',
    metatype: CreateMembershipRequestDto,
  }) as Promise<CreateMembershipRequestDto>;

describe('CreateMembershipRequestDto', () => {
  it('accepts no message at all', async () => {
    await expect(validate({})).resolves.toEqual({});
  });

  it('trims the message and drops a blank one', async () => {
    await expect(validate({ message: '  Ahoj  ' })).resolves.toEqual({
      message: 'Ahoj',
    });
    await expect(validate({ message: '\n\t ' })).resolves.toEqual({
      message: undefined,
    });
  });

  it('counts characters like the database does', async () => {
    const atLimit = '🏐'.repeat(MEMBERSHIP_REQUEST_MESSAGE_MAX_LENGTH);
    await expect(validate({ message: atLimit })).resolves.toEqual({
      message: atLimit,
    });
    await expect(validate({ message: `${atLimit}x` })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(['userId', 'groupId', 'status'])(
    'refuses %s, which the server decides',
    async (field) => {
      await expect(validate({ [field]: 'x' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
});
