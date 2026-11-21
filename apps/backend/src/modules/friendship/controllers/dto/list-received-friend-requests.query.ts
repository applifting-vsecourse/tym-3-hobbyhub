import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

// #228: where the page of requests waiting for me starts. The page size is
// fixed (`RECEIVED_FRIEND_REQUESTS_PAGE_SIZE`).
export class ListReceivedFriendRequestsQuery {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
