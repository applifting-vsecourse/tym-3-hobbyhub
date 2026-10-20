import {
  EVENT_LIST_DEFAULT_LIMIT,
  EVENT_LIST_MAX_LIMIT,
} from '@/modules/event/domain/event';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListEventsQuery {
  @ApiPropertyOptional({
    default: EVENT_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: EVENT_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(EVENT_LIST_MAX_LIMIT)
  limit: number = EVENT_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
