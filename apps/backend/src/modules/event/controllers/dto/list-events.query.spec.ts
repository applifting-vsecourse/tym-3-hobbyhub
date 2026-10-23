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
});
