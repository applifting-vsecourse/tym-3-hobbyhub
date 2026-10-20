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
});
