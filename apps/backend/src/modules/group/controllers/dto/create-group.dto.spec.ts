import { groupsValidationPipe } from '@/modules/group/controllers/groups-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { CreateGroupDto } from './create-group.dto';

const validBody = {
  name: 'Čtvrteční florbalisté',
  activityId: 'a1',
  description: 'Hrajeme každý čtvrtek.',
};

// What the endpoint does with a request body before the handler sees it.
const validate = (body: Record<string, unknown>): Promise<CreateGroupDto> =>
  groupsValidationPipe.transform(body, {
    type: 'body',
    metatype: CreateGroupDto,
  }) as Promise<CreateGroupDto>;

describe('CreateGroupDto', () => {
  describe('through the endpoint pipe', () => {
    it('trims the text and drops blank optional fields', async () => {
      await expect(
        validate({
          ...validBody,
          name: '  Čtvrteční florbalisté  ',
          locationName: '   ',
          usualSchedule: ' čtvrtky 19:00 ',
        }),
      ).resolves.toEqual({
        ...validBody,
        locationName: undefined,
        usualSchedule: 'čtvrtky 19:00',
      });
    });

    it.each(['visibility', 'role', 'ownerId'])(
      'refuses %s, which the server decides',
      async (field) => {
        await expect(
          validate({ ...validBody, [field]: 'PRIVATE' }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('refuses a name shorter than three characters after trimming', async () => {
      await expect(
        validate({ ...validBody, name: '  ab  ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // The database counts characters, not UTF-16 units: two emoji are two
    // characters and must be refused here, not by the CHECK (→ 500).
    it('counts an emoji as one character', async () => {
      await expect(
        validate({ ...validBody, name: '🏀🏀' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        validate({ ...validBody, name: '🏀'.repeat(80) }),
      ).resolves.toMatchObject({ name: '🏀'.repeat(80) });
      await expect(
        validate({ ...validBody, name: '🏀'.repeat(81) }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('limits the optional fields in characters', async () => {
      await expect(
        validate({ ...validBody, locationName: '🏀'.repeat(100) }),
      ).resolves.toMatchObject({ locationName: '🏀'.repeat(100) });
      await expect(
        validate({ ...validBody, locationName: 'a'.repeat(101) }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
