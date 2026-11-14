import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { BlockUserDto } from './block-user.dto';

const validate = (body: Record<string, unknown>): Promise<BlockUserDto> =>
  adminValidationPipe.transform(body, {
    type: 'body',
    metatype: BlockUserDto,
  }) as Promise<BlockUserDto>;

const REASON = 'Opakované obtěžování po akci.';

describe('BlockUserDto (#239)', () => {
  it('takes the other person and a trimmed reason', async () => {
    const dto = await validate({ otherUserId: 'u2', reason: `  ${REASON} ` });

    expect(dto).toEqual({ otherUserId: 'u2', reason: REASON });
  });

  it.each([
    ['no other person', { reason: REASON }],
    ['an empty other person', { otherUserId: '', reason: REASON }],
    ['no reason', { otherUserId: 'u2' }],
    ['a reason under 10 characters', { otherUserId: 'u2', reason: 'Spam' }],
    [
      'a reason over 500 characters',
      { otherUserId: 'u2', reason: 'x'.repeat(501) },
    ],
    ['an unknown field', { otherUserId: 'u2', reason: REASON, both: true }],
  ])('refuses %s', async (_case, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
