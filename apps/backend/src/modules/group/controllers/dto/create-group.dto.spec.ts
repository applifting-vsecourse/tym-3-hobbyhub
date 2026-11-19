import { groupsValidationPipe } from '@/modules/group/controllers/groups-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { CreateGroupDto } from './create-group.dto';

const validBody = {
  name: 'Čtvrteční florbalisté',
  activityId: 'a1',
  description: 'Hrajeme každý čtvrtek.',
  locationName: 'Praha 8',
  latitude: 50.1297,
  longitude: 14.4421,
};

// What the endpoint does with a request body before the handler sees it.
const validate = (body: Record<string, unknown>): Promise<CreateGroupDto> =>
  groupsValidationPipe.transform(body, {
    type: 'body',
    metatype: CreateGroupDto,
  }) as Promise<CreateGroupDto>;

describe('CreateGroupDto', () => {
  describe('through the endpoint pipe', () => {
    it('trims the text and drops a blank schedule', async () => {
      await expect(
        validate({
          ...validBody,
          name: '  Čtvrteční florbalisté  ',
          locationName: '  Praha 8 ',
          usualSchedule: ' čtvrtky 19:00 ',
        }),
      ).resolves.toEqual({
        ...validBody,
        usualSchedule: 'čtvrtky 19:00',
      });
    });

    // ADR-0028: a group needs a place on the map.
    it.each(['locationName', 'latitude', 'longitude'])(
      'refuses a group without %s',
      async (field) => {
        await expect(
          validate({ ...validBody, [field]: undefined }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('refuses a blank place', async () => {
      await expect(
        validate({ ...validBody, locationName: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
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
