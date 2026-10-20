import {
  EVENT_LIST_DEFAULT_LIMIT,
  EVENT_LIST_LOCATION_MAX_LENGTH,
  EVENT_LIST_MAX_ACTIVITY_FILTERS,
  EVENT_LIST_MAX_LIMIT,
  EVENT_LIST_SEARCH_MAX_LENGTH,
} from '@/modules/event/domain/event';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({
    type: [String],
    description:
      'Only events of these activities (repeat the parameter); none means all',
  })
  @IsOptional()
  // One value arrives as a string, several as an array.
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayMaxSize(EVENT_LIST_MAX_ACTIVITY_FILTERS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  activityIds: string[] = [];

  @ApiPropertyOptional({
    maxLength: EVENT_LIST_SEARCH_MAX_LENGTH,
    description:
      'Part of the title, place, city, district or activity; ignores case and diacritics',
  })
  @IsOptional()
  @IsString()
  @MaxLength(EVENT_LIST_SEARCH_MAX_LENGTH)
  search?: string;

  // TODO(F-02.1b #91): replace the text with a point and a radius once events
  // have coordinates (geocoding, F-12.3); keep the text as the fallback.
  @ApiPropertyOptional({
    maxLength: EVENT_LIST_LOCATION_MAX_LENGTH,
    description:
      'Part of the place, city or district; ignores case and diacritics',
  })
  @IsOptional()
  @IsString()
  @MaxLength(EVENT_LIST_LOCATION_MAX_LENGTH)
  location?: string;
}
