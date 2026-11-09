import { EventFilterQuery } from '@/modules/event/controllers/dto/event-filter.query';
import {
  MY_EVENTS_DEFAULT_LIMIT,
  MY_EVENTS_MAX_LIMIT,
} from '@/modules/my-events/domain/my-events';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// A page of one of the two lists, narrowed by the same filter as the public
// event list (#177).
export class MyEventsPageQuery extends EventFilterQuery {
  @ApiPropertyOptional({
    default: MY_EVENTS_DEFAULT_LIMIT,
    minimum: 1,
    maximum: MY_EVENTS_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MY_EVENTS_MAX_LIMIT)
  limit: number = MY_EVENTS_DEFAULT_LIMIT;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
