import {
  MY_EVENTS_DEFAULT_LIMIT,
  MY_EVENTS_MAX_LIMIT,
} from '@/modules/my-events/domain/my-events';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MyEventsPageQuery {
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
