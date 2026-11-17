import {
  FRIEND_SEARCH_MAX_LENGTH,
  FRIEND_SEARCH_MAX_RESULTS,
  FRIEND_SEARCH_MIN_LENGTH,
  FRIEND_SEARCH_PAGE_SIZE,
} from '@/modules/friendship/domain/friendship';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** The last page that may start: the search shows at most 100 people. */
const LAST_OFFSET = FRIEND_SEARCH_MAX_RESULTS - FRIEND_SEARCH_PAGE_SIZE;

// #225: the text to look for in the nickname, the one name a person has
// (ADR-0025), never in e-mails, and where the page starts. The page size is
// fixed (`FRIEND_SEARCH_PAGE_SIZE`), and so is how far the pages go.
export class SearchFriendsQuery {
  @ApiProperty({
    minLength: FRIEND_SEARCH_MIN_LENGTH,
    maxLength: FRIEND_SEARCH_MAX_LENGTH,
    description: 'Part of the nickname; case and diacritics do not matter',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(FRIEND_SEARCH_MIN_LENGTH)
  @MaxLength(FRIEND_SEARCH_MAX_LENGTH)
  q!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: LAST_OFFSET, default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(LAST_OFFSET)
  offset: number = 0;
}
