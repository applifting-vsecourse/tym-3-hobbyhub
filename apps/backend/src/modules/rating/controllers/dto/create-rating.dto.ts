import { CharLength } from '@/core/validation/char-length.decorator';
import {
  RATING_COMMENT_MAX_LENGTH,
  RATING_STARS_MAX,
  RATING_STARS_MIN,
} from '@/modules/rating/domain/rating';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Optional text: whitespace only counts as not filled in.
const trimToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

// #236: who rates comes from the session and who is rated from the route,
// so the body holds only what the author says.
export class CreateRatingDto {
  @ApiProperty({
    minimum: RATING_STARS_MIN,
    maximum: RATING_STARS_MAX,
    example: 5,
    description: 'Whole stars',
  })
  @IsInt()
  @Min(RATING_STARS_MIN)
  @Max(RATING_STARS_MAX)
  stars!: number;

  @ApiPropertyOptional({
    description:
      'Seen only by the author and, once the rating period is over, the rated person',
    example: 'Skvělá organizace, kurt zamluvený včas.',
    maxLength: RATING_COMMENT_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, RATING_COMMENT_MAX_LENGTH)
  comment?: string;
}
