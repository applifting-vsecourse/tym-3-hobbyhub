import { groupsValidationPipe } from '@/modules/group/controllers/groups-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { TransferOwnershipDto } from './transfer-ownership.dto';
import { UpdateMemberRoleDto } from './update-member-role.dto';

// What the endpoints do with a request body before the handler sees it.
const validate = (
  metatype: typeof UpdateMemberRoleDto | typeof TransferOwnershipDto,
  body: Record<string, unknown>,
): Promise<unknown> =>
  groupsValidationPipe.transform(body, { type: 'body', metatype });

describe('UpdateMemberRoleDto', () => {
  it.each(['ADMIN', 'MEMBER'])('accepts %s', async (role) => {
    await expect(validate(UpdateMemberRoleDto, { role })).resolves.toEqual({
      role,
    });
  });

  it.each([['OWNER'], ['admin'], [undefined]])(
    'refuses %s, which is not an assignable role',
    async (role) => {
      await expect(
        validate(UpdateMemberRoleDto, { role }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});

describe('TransferOwnershipDto', () => {
  it('accepts a user id', async () => {
    await expect(
      validate(TransferOwnershipDto, { userId: 'u2' }),
    ).resolves.toEqual({ userId: 'u2' });
  });

  it.each([[''], [42], [undefined]])('refuses %p', async (userId) => {
    await expect(
      validate(TransferOwnershipDto, { userId }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
