import { ratingsValidationPipe } from '@/modules/rating/controllers/ratings-validation.pipe';
import { RATING_COMMENT_MAX_LENGTH } from '@/modules/rating/domain/rating';
import { BadRequestException } from '@nestjs/common';
import { CreateRatingDto } from './create-rating.dto';
import { ListReceivedRatingsQuery } from './list-ratings.query';

// What the endpoint does with a request body before the handler sees it.
const validate = (body: Record<string, unknown>): Promise<CreateRatingDto> =>
  ratingsValidationPipe.transform(body, {
    type: 'body',
    metatype: CreateRatingDto,
  }) as Promise<CreateRatingDto>;

describe('CreateRatingDto', () => {
  it('accepts stars without a comment', async () => {
    await expect(validate({ stars: 4 })).resolves.toEqual({ stars: 4 });
  });

  it.each([0, 6, 3.5, '4', null])('refuses %p stars', async (stars) => {
    await expect(validate({ stars })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses a rating without stars', async () => {
    await expect(validate({ comment: 'Super' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('trims the comment and drops a blank one', async () => {
    await expect(validate({ stars: 5, comment: '  Super  ' })).resolves.toEqual(
      { stars: 5, comment: 'Super' },
    );
    await expect(validate({ stars: 5, comment: '   ' })).resolves.toEqual({
      stars: 5,
      comment: undefined,
    });
  });

  it('counts characters like the database does', async () => {
    const atLimit = '🏸'.repeat(RATING_COMMENT_MAX_LENGTH);
    await expect(validate({ stars: 1, comment: atLimit })).resolves.toEqual({
      stars: 1,
      comment: atLimit,
    });
    await expect(
      validate({ stars: 1, comment: `${atLimit}x` }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['authorId', 'ratedUserId', 'direction', 'eventId'])(
    'refuses %s, which the server decides',
    async (field) => {
      await expect(validate({ stars: 5, [field]: 'x' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );
});

describe('ListReceivedRatingsQuery', () => {
  const query = (params: Record<string, unknown>): Promise<unknown> =>
    ratingsValidationPipe.transform(params, {
      type: 'query',
      metatype: ListReceivedRatingsQuery,
    });

  it('needs a direction and pages by default', async () => {
    await expect(query({ direction: 'TO_ORGANIZER' })).resolves.toMatchObject({
      direction: 'TO_ORGANIZER',
      limit: 20,
      offset: 0,
    });
    await expect(query({})).rejects.toBeInstanceOf(BadRequestException);
    await expect(query({ direction: 'SIDEWAYS' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
