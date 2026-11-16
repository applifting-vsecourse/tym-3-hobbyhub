import { eventsValidationPipe } from '@/modules/event/controllers/events-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { ListEventsQuery } from './list-events.query';

// What the endpoint does with the query string before the handler sees it.
const validate = (query: Record<string, unknown>): Promise<ListEventsQuery> =>
  eventsValidationPipe.transform(query, {
    type: 'query',
    metatype: ListEventsQuery,
  }) as Promise<ListEventsQuery>;

describe('ListEventsQuery', () => {
  it('filters by nothing when no activity is given', async () => {
    expect((await validate({})).activityIds).toEqual([]);
  });

  it('takes a single activity as a list of one', async () => {
    expect((await validate({ activityIds: 'a1' })).activityIds).toEqual(['a1']);
  });

  it('takes a repeated parameter as several activities', async () => {
    const query = await validate({ activityIds: ['a1', 'a2'] });
    expect(query.activityIds).toEqual(['a1', 'a2']);
  });

  it('takes a search text and a location', async () => {
    const query = await validate({ search: 'florb', location: 'Praha 8' });
    expect(query.search).toBe('florb');
    expect(query.location).toBe('Praha 8');
  });

  it('takes the number ranges and the free-seat switch', async () => {
    const query = await validate({
      onlyWithFreeSpots: 'true',
      priceFrom: '0',
      priceTo: '200.50',
      durationHoursFrom: '1',
      durationHoursTo: '3',
      capacityFrom: '4',
      capacityTo: '12',
    });
    expect(query).toMatchObject({
      onlyWithFreeSpots: true,
      priceFrom: 0,
      priceTo: 200.5,
      durationHoursFrom: 1,
      durationHoursTo: 3,
      capacityFrom: 4,
      capacityTo: 12,
    });
  });

  it('takes the free-seat switch however it is written', async () => {
    expect(
      (await validate({ onlyWithFreeSpots: 'TRUE' })).onlyWithFreeSpots,
    ).toBe(true);
    expect((await validate({ onlyWithFreeSpots: '1' })).onlyWithFreeSpots).toBe(
      true,
    );
    expect((await validate({ onlyWithFreeSpots: '0' })).onlyWithFreeSpots).toBe(
      false,
    );
    await expect(
      validate({ onlyWithFreeSpots: 'maybe' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reads a blank number as no value, not as 0', async () => {
    const query = await validate({ priceFrom: '', capacityTo: '' });
    expect(query.priceFrom).toBeUndefined();
    expect(query.capacityTo).toBeUndefined();
  });

  it('refuses negative, fractional-capacity and non-numeric values', async () => {
    await expect(validate({ priceFrom: '-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(validate({ capacityFrom: '2.5' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(validate({ durationHoursTo: 'long' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('takes a range of days', async () => {
    const query = await validate({
      dateFrom: '2026-11-15',
      dateTo: '2026-11-30',
    });
    expect(query.dateFrom).toBe('2026-11-15');
    expect(query.dateTo).toBe('2026-11-30');
  });

  it('takes a blank day as no day', async () => {
    const query = await validate({ dateFrom: '', dateTo: '' });
    expect(query.dateFrom).toBeUndefined();
    expect(query.dateTo).toBeUndefined();
  });

  it.each(['15.11.2026', '2026-02-30', '2026-11-15T10:00:00Z', 'tomorrow'])(
    'refuses %s as a day',
    async (dateFrom) => {
      await expect(validate({ dateFrom })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it('refuses a search text that is too long', async () => {
    await expect(validate({ search: 'x'.repeat(101) })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses an empty activity', async () => {
    await expect(validate({ activityIds: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses more activities than there can be', async () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `a${i}`);
    await expect(validate({ activityIds: tooMany })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('takes a position given as numbers in the query string', async () => {
    const query = await validate({ lat: '50.08', lng: '14.42' });
    expect(query.lat).toBe(50.08);
    expect(query.lng).toBe(14.42);
  });

  it('works without a position', async () => {
    const query = await validate({});
    expect(query.lat).toBeUndefined();
    expect(query.lng).toBeUndefined();
  });

  it('refuses a latitude without a longitude, and the other way round', async () => {
    await expect(validate({ lat: '50' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(validate({ lng: '14' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses a position outside the globe', async () => {
    await expect(validate({ lat: '91', lng: '14' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(validate({ lat: '50', lng: '181' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('takes a blank position as none, not as the point 0,0', async () => {
    const query = await validate({ lat: '', lng: '' });
    expect(query.lat).toBeUndefined();
    expect(query.lng).toBeUndefined();
  });
});
