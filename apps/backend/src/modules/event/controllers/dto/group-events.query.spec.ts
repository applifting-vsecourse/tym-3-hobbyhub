import { eventsValidationPipe } from '@/modules/event/controllers/events-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { GroupEventsQuery } from './group-events.query';

// What the endpoint does with the query string before the handler sees it.
const validate = (query: Record<string, unknown>): Promise<GroupEventsQuery> =>
  eventsValidationPipe.transform(query, {
    type: 'query',
    metatype: GroupEventsQuery,
  }) as Promise<GroupEventsQuery>;

describe('GroupEventsQuery', () => {
  it('starts at the first page of the upcoming events', async () => {
    await expect(validate({})).resolves.toMatchObject({
      period: 'upcoming',
      offset: 0,
    });
  });

  it('reads the past and an offset from the query string', async () => {
    await expect(
      validate({ period: 'past', offset: '10' }),
    ).resolves.toMatchObject({ period: 'past', offset: 10 });
  });

  it.each([
    ['an unknown period', { period: 'all' }],
    ['a negative offset', { offset: '-1' }],
    ['a page size, which the server decides', { limit: '100' }],
  ])('refuses %s', async (_name, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
