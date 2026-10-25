import { eventsValidationPipe } from '@/modules/event/controllers/events-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { UpdateEventDto } from './update-event.dto';

const validBody = {
  title: 'Čtvrteční florbal',
  activityId: 'a1',
  description: 'Rekreační hra pro mírně pokročilé.',
  venueType: 'PUBLIC_VENUE',
  approvalMode: 'MANUAL',
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

const validate = (body: Record<string, unknown>): Promise<UpdateEventDto> =>
  eventsValidationPipe.transform(body, {
    type: 'body',
    metatype: UpdateEventDto,
  }) as Promise<UpdateEventDto>;

describe('UpdateEventDto', () => {
  it('takes the whole form of an event at a place', async () => {
    const dto = await validate(validBody);

    expect(dto.location?.city).toBe('Praha 8');
    expect(dto.startAt).toEqual(new Date(validBody.startAt));
  });

  it('takes the position of the address', async () => {
    const dto = await validate({
      ...validBody,
      location: { ...validBody.location, latitude: 50.1, longitude: 14.4 },
    });

    expect(dto.location?.latitude).toBe(50.1);
    expect(dto.location?.longitude).toBe(14.4);
  });

  it('takes an online event without an address', async () => {
    const { location: _location, ...online } = validBody;
    void _location;
    const dto = await validate({ ...online, venueType: 'ONLINE' });

    expect(dto.venueType).toBe('ONLINE');
    expect(dto.location).toBeUndefined();
  });

  it.each([
    ['an unknown kind of event', { venueType: 'ON_THE_MOON' }],
    ['an empty address', { location: {} }],
    ['an address missing the city', { location: { street: 'Ulice 1' } }],
    ['a blank title', { title: '   ' }],
  ])('refuses %s', async (_, override) => {
    await expect(
      validate({ ...validBody, ...override }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
