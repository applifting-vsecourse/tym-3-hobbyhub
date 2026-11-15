import {
  FRIEND_SEARCH_MAX_LENGTH,
  FRIEND_SEARCH_MIN_LENGTH,
} from '@/modules/friendship/domain/friendship';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

// #225: the text to look for in names and usernames (never in e-mails), and
// where the page starts. The page size is fixed (`FRIEND_SEARCH_PAGE_SIZE`).
export class SearchFriendsQuery {
  @ApiProperty({
    minLength: FRIEND_SEARCH_MIN_LENGTH,
    maxLength: FRIEND_SEARCH_MAX_LENGTH,
    description:
      'Part of the name or username; case and diacritics do not matter',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(FRIEND_SEARCH_MIN_LENGTH)
  @MaxLength(FRIEND_SEARCH_MAX_LENGTH)
  q!: string;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
