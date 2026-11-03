import { membershipRequestsValidationPipe } from '@/modules/membership-request/controllers/membership-requests-validation.pipe';
import { MEMBERSHIP_REQUEST_REJECTION_REASON_MAX_LENGTH } from '@/modules/membership-request/domain/membership-request';
import { BadRequestException } from '@nestjs/common';
import { RejectMembershipRequestDto } from './reject-membership-request.dto';

// What the endpoint does with a request body before the handler sees it.
const validate = (
  body: Record<string, unknown>,
): Promise<RejectMembershipRequestDto> =>
  membershipRequestsValidationPipe.transform(body, {
    type: 'body',
    metatype: RejectMembershipRequestDto,
  }) as Promise<RejectMembershipRequestDto>;

describe('RejectMembershipRequestDto', () => {
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
    const atLimit = '🏐'.repeat(MEMBERSHIP_REQUEST_REJECTION_REASON_MAX_LENGTH);
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
