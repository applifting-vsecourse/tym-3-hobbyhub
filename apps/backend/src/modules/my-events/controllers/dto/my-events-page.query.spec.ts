import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MyEventsPageQuery } from './my-events-page.query';

const errorsOf = (
  input: Record<string, unknown>,
): ReturnType<typeof validate> =>
  validate(plainToInstance(MyEventsPageQuery, input));

describe('MyEventsPageQuery', () => {
  it('defaults to the first page', async () => {
    const query = plainToInstance(MyEventsPageQuery, {});

    expect(await validate(query)).toHaveLength(0);
    expect(query).toMatchObject({ limit: 20, offset: 0 });
  });

  it.each([
    { limit: '0' },
    { limit: '51' },
    { limit: 'abc' },
    { offset: '-1' },
  ])('refuses %j', async (input) => {
    expect(await errorsOf(input)).not.toHaveLength(0);
  });
});
