import {
  EVENT_CONTRIBUTION_MAX_AMOUNT,
  EVENT_LIST_DEFAULT_LIMIT,
  EVENT_LIST_MAX_DURATION_HOURS,
  EVENT_LIST_MAX_LIMIT,
  EVENT_PARTICIPANTS_LIMIT,
} from '@/modules/event/domain/event';
import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { blankToUndefined, EventFilterQuery } from './event-filter.query';

// "?priceFrom=" is no value, not 0 CZK.
const optionalNumber = (
  description: string,
  maximum: number,
  integer = false,
): PropertyDecorator =>
  applyDecorators(
    ApiPropertyOptional({ minimum: 0, maximum, description }),
    Transform(blankToUndefined),
    IsOptional(),
    Type(() => Number),
    integer ? IsInt() : IsNumber({ maxDecimalPlaces: 2 }),
    Min(0),
    Max(maximum),
  );

// The ranges only the public list offers (#214); both ends are inclusive.
export class ListEventsRangesQuery extends EventFilterQuery {
  @ApiPropertyOptional({
    description: 'Only events that still have a free seat',
  })
  // "true", "TRUE" and "1" switch it on, "false" and "0" off; anything else is refused.
  @Transform(({ value }: { value: unknown }) => {
    const text = String(value).toLowerCase();
    if (text === 'true' || text === '1') return true;
    if (text === 'false' || text === '0') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  onlyWithFreeSpots?: boolean;

  @optionalNumber(
    'Lowest contribution per seat in CZK (an event without one costs 0)',
    EVENT_CONTRIBUTION_MAX_AMOUNT,
  )
  priceFrom?: number;

  @optionalNumber(
    'Highest contribution per seat in CZK',
    EVENT_CONTRIBUTION_MAX_AMOUNT,
  )
  priceTo?: number;

  @optionalNumber('Shortest event in hours', EVENT_LIST_MAX_DURATION_HOURS)
  durationHoursFrom?: number;

  @optionalNumber('Longest event in hours', EVENT_LIST_MAX_DURATION_HOURS)
  durationHoursTo?: number;

  @optionalNumber(
    'Fewest people the event holds',
    EVENT_PARTICIPANTS_LIMIT,
    true,
  )
  capacityFrom?: number;

  @optionalNumber('Most people the event holds', EVENT_PARTICIPANTS_LIMIT, true)
  capacityTo?: number;
}

export class ListEventsQuery extends ListEventsRangesQuery {
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
