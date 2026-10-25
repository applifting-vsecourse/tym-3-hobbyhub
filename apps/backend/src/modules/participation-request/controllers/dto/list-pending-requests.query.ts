import {
  PENDING_REQUESTS_DEFAULT_LIMIT,
  PENDING_REQUESTS_MAX_LIMIT,
} from '@/modules/participation-request/domain/participation-request';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListPendingRequestsQuery {
  @ApiPropertyOptional({
    default: PENDING_REQUESTS_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PENDING_REQUESTS_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PENDING_REQUESTS_MAX_LIMIT)
  limit: number = PENDING_REQUESTS_DEFAULT_LIMIT;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
