import {
  RATING_DIRECTIONS,
  RatingDirection,
  RATINGS_DEFAULT_LIMIT,
  RATINGS_MAX_LIMIT,
} from '@/modules/rating/domain/rating';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListGivenRatingsQuery {
  @ApiPropertyOptional({
    default: RATINGS_DEFAULT_LIMIT,
    minimum: 1,
    maximum: RATINGS_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RATINGS_MAX_LIMIT)
  limit: number = RATINGS_DEFAULT_LIMIT;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}

export class ListReceivedRatingsQuery extends ListGivenRatingsQuery {
  @ApiProperty({
    enum: RATING_DIRECTIONS,
    description:
      'TO_ORGANIZER: ratings received as an organizer; TO_PARTICIPANT: as a participant',
  })
  @IsIn(RATING_DIRECTIONS)
  direction!: RatingDirection;
}
