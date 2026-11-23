import {
  DEFAULT_FRIEND_LIST_SORT,
  FRIEND_LIST_SORTS,
  FriendListSort,
} from '@/modules/friendship/domain/friendship';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

// #226: the order of my friends and where the page starts. The page size is
// fixed (`FRIENDS_PAGE_SIZE`).
export class ListFriendsQuery {
  @ApiPropertyOptional({
    enum: FRIEND_LIST_SORTS,
    default: DEFAULT_FRIEND_LIST_SORT,
    description:
      'newest/oldest: by when the friendship began; name_asc/name_desc: by nickname',
  })
  @IsOptional()
  @IsIn(FRIEND_LIST_SORTS)
  sort: FriendListSort = DEFAULT_FRIEND_LIST_SORT;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
