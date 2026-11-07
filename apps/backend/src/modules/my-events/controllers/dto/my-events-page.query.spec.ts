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

  // The overview is always the caller's own: whose it is never comes from the
  // request (docs/visibility-matrix).
  it.each([{ userId: 'someone-else' }, { user: 'someone-else' }])(
    'refuses %j, the overview of another user cannot be asked for',
    async (input) => {
      await expect(parse(input)).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
