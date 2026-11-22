import { userBlocksValidationPipe } from '@/modules/user-block/controllers/user-blocks-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { BlockAsUserDto } from './block-as-user.dto';

const validate = (body: Record<string, unknown>): Promise<BlockAsUserDto> =>
  userBlocksValidationPipe.transform(body, {
    type: 'body',
    metatype: BlockAsUserDto,
  }) as Promise<BlockAsUserDto>;

describe('BlockAsUserDto', () => {
  it('accepts the person to block', async () => {
    await expect(validate({ userId: 'u2' })).resolves.toMatchObject({
      userId: 'u2',
    });
  });

  it.each([
    ['no person', {}],
    ['an empty id', { userId: '' }],
    // The blocker comes from the session, never from the body.
    ['a blocker', { userId: 'u2', blockerId: 'u3' }],
    [
      'a reason, which only an administrator gives',
      { userId: 'u2', reason: 'Obtěžuje mě po akci.' },
    ],
  ])('refuses %s', async (_name, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
