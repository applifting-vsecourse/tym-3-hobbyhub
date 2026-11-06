import { eventsValidationPipe } from '@/modules/event/controllers/events-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { UpdateExternalSpotsDto } from './update-external-spots.dto';

const validate = (
  body: Record<string, unknown>,
): Promise<UpdateExternalSpotsDto> =>
  eventsValidationPipe.transform(body, {
    type: 'body',
    metatype: UpdateExternalSpotsDto,
  }) as Promise<UpdateExternalSpotsDto>;

describe('UpdateExternalSpotsDto', () => {
  it.each([0, 3, 500])('takes %i seats', async (externalOccupiedSpots) => {
    const dto = await validate({ externalOccupiedSpots });

    expect(dto.externalOccupiedSpots).toBe(externalOccupiedSpots);
  });

  it.each([
    ['a negative number', -1],
    ['more than the limit', 501],
    ['a fraction', 1.5],
    ['text', '3'],
    ['nothing', undefined],
  ])('refuses %s', async (_, externalOccupiedSpots) => {
    await expect(validate({ externalOccupiedSpots })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses other fields', async () => {
    await expect(
      validate({ externalOccupiedSpots: 1, maxParticipants: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
