import { eventsValidationPipe } from '@/modules/event/controllers/events-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { CreateEventDto } from './create-event.dto';

const validBody = {
  title: 'Čtvrteční florbal',
  activityId: 'a1',
  description: 'Rekreační hra pro mírně pokročilé.',
  venueType: 'PUBLIC_VENUE',
  startAt: '2030-01-15T18:00:00.000Z',
  endAt: '2030-01-15T19:30:00.000Z',
  location: {
    street: 'Chabařovická 4',
    city: 'Praha 8',
    postalCode: '182 00',
    country: 'Česko',
  },
  minParticipants: 8,
  maxParticipants: 12,
  externalOccupiedSpots: 4,
};

// What the endpoint does with a request body before the handler sees it.
const validate = (body: Record<string, unknown>): Promise<CreateEventDto> =>
  eventsValidationPipe.transform(body, {
    type: 'body',
    metatype: CreateEventDto,
  }) as Promise<CreateEventDto>;

describe('CreateEventDto', () => {
  describe('through the endpoint pipe', () => {
    it('parses dates, trims text and drops blank optional fields', async () => {
      const dto = await validate({
        ...validBody,
        title: '  Čtvrteční florbal ',
        equipment: '   ',
        contributionAmount: 80,
        contributionNote: ' platí se na místě ',
        location: { ...validBody.location, placeName: '  ' },
      });

      expect(dto).toMatchObject({
        title: 'Čtvrteční florbal',
        equipment: undefined,
        contributionAmount: 80,
        contributionNote: 'platí se na místě',
        location: { ...validBody.location, placeName: undefined },
      });
      expect(dto.startAt).toEqual(new Date(validBody.startAt));
      expect(dto.endAt).toEqual(new Date(validBody.endAt));
    });

    it.each(['status', 'visibility', 'organizerId', 'publishedAt'])(
      'refuses %s, which the server decides',
      async (field) => {
        await expect(
          validate({ ...validBody, [field]: 'x' }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('refuses an online event until the PO decides on it', async () => {
      await expect(
        validate({ ...validBody, venueType: 'ONLINE' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a date that is not a date', async () => {
      await expect(
        validate({ ...validBody, startAt: 'čtvrtek večer' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      ['a missing address', { location: undefined }],
      [
        'an address without a city',
        { location: { ...validBody.location, city: ' ' } },
      ],
      [
        'coordinates, which geocoding will set',
        { location: { ...validBody.location, latitude: 50.1 } },
      ],
    ])('refuses %s', async (_, override) => {
      await expect(
        validate({ ...validBody, ...override }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it.each([
      ['a fractional number of people', { minParticipants: 7.5 }],
      ['a minimum of zero', { minParticipants: 0 }],
      ['negative occupied seats', { externalOccupiedSpots: -1 }],
      ['a negative contribution', { contributionAmount: -1 }],
      [
        'a contribution with more than two decimals',
        { contributionAmount: 1.234 },
      ],
    ])('refuses %s', async (_, override) => {
      await expect(
        validate({ ...validBody, ...override }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // The database counts characters, not UTF-16 units.
    it('counts an emoji as one character', async () => {
      await expect(
        validate({ ...validBody, title: '🏀🏀' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        validate({ ...validBody, title: '🏀'.repeat(80) }),
      ).resolves.toMatchObject({ title: '🏀'.repeat(80) });
      await expect(
        validate({ ...validBody, title: '🏀'.repeat(81) }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
