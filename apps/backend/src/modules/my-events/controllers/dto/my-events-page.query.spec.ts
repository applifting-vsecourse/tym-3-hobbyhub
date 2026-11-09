import { myEventsValidationPipe } from '@/modules/my-events/controllers/my-events-validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { MyEventsPageQuery } from './my-events-page.query';

// Through the endpoints' own pipe, so the spec checks what they do.
const metadata: ArgumentMetadata = {
  type: 'query',
  metatype: MyEventsPageQuery,
};
const parse = (input: Record<string, unknown>): Promise<unknown> =>
  myEventsValidationPipe.transform(input, metadata);

describe('MyEventsPageQuery', () => {
  it('defaults to the first page', async () => {
    await expect(parse({})).resolves.toMatchObject({ limit: 20, offset: 0 });
  });

  it('turns the query strings into numbers', async () => {
    await expect(parse({ limit: '50', offset: '40' })).resolves.toMatchObject({
      limit: 50,
      offset: 40,
    });
  });

  it.each([
    { limit: '0' },
    { limit: '51' },
    { limit: 'abc' },
    { offset: '-1' },
  ])('refuses %j', async (input) => {
    await expect(parse(input)).rejects.toBeInstanceOf(BadRequestException);
  });

  // The same filter as the public event list (#177).
  it('takes the filter of the event list', async () => {
    await expect(
      parse({
        activityIds: 'a1',
        search: 'florbal',
        location: 'Praha 8',
        dateFrom: '2030-01-01',
        dateTo: '2030-01-31',
      }),
    ).resolves.toMatchObject({
      activityIds: ['a1'],
      search: 'florbal',
      location: 'Praha 8',
      dateFrom: '2030-01-01',
      dateTo: '2030-01-31',
    });
  });

  it('filters by nothing without a filter', async () => {
    await expect(parse({})).resolves.toMatchObject({ activityIds: [] });
  });

  it.each([
    { search: 'x'.repeat(101) },
    { location: 'x'.repeat(101) },
    { dateFrom: '1. 1. 2030' },
    { activityIds: '' },
    // The overview sorts by its own rule; a position means nothing here.
    { lat: '50', lng: '14' },
  ])('refuses the filter %j', async (input) => {
    await expect(parse(input)).rejects.toBeInstanceOf(BadRequestException);
  });

  // The overview is always the caller's own: whose it is never comes from the
  // request (docs/visibility-matrix).
  it.each([{ userId: 'someone-else' }, { user: 'someone-else' }])(
    'refuses %j, the overview of another user cannot be asked for',
    async (input) => {
      await expect(parse(input)).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
