import {
  EVENT_LIST_DEFAULT_LIMIT,
  EVENT_LIST_MAX_LIMIT,
} from '@/modules/event/domain/event';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { blankToUndefined, EventFilterQuery } from './event-filter.query';

export class ListEventsQuery extends EventFilterQuery {
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

  @ApiPropertyOptional({
    minimum: -90,
    maximum: 90,
    description:
      'Latitude of the visitor; with `lng` sorts by distance, nearest first',
  })
  @Transform(blankToUndefined)
  @ValidateIf((query: ListEventsQuery) => query.lng !== undefined)
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({
    minimum: -180,
    maximum: 180,
    description: 'Longitude of the visitor; always sent together with `lat`',
  })
  @Transform(blankToUndefined)
  @ValidateIf((query: ListEventsQuery) => query.lat !== undefined)
  @Type(() => Number)
  @IsLongitude()
  lng?: number;
}
