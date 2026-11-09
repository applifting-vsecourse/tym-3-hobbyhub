import {
  EVENT_LIST_LOCATION_MAX_LENGTH,
  EVENT_LIST_MAX_ACTIVITY_FILTERS,
  EVENT_LIST_SEARCH_MAX_LENGTH,
  EventFilter,
} from '@/modules/event/domain/event';
import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// "?lat=" would become the number 0, a point in the Gulf of Guinea: blank is no value.
// (Read from the raw object: the number conversion has already turned it into 0.)
export const blankToUndefined = ({
  value,
  obj,
  key,
}: {
  value: unknown;
  obj: unknown;
  key: string;
}): unknown =>
  (obj as Record<string, unknown>)[key] === '' ? undefined : value;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar day written YYYY-MM-DD, not a date-time.
const IsIsoDay = (): PropertyDecorator =>
  applyDecorators(Matches(ISO_DAY), IsISO8601({ strict: true }));

// The filter of an event listing as query parameters (`EventFilter`), shared by
// the public list and a person's own overview (#177), so both take the same.
export class EventFilterQuery {
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

  @ApiPropertyOptional({
    example: '2026-11-15',
    description:
      'First day (YYYY-MM-DD, Prague time) on which a listed event starts',
  })
  @Transform(blankToUndefined)
  @IsOptional()
  @IsIsoDay()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description:
      'Last day (YYYY-MM-DD, Prague time) on which a listed event starts',
  })
  @Transform(blankToUndefined)
  @IsOptional()
  @IsIsoDay()
  dateTo?: string;
}

export const eventFilterOf = (query: EventFilterQuery): EventFilter => ({
  activityIds: query.activityIds,
  search: query.search,
  location: query.location,
  dateFrom: query.dateFrom,
  dateTo: query.dateTo,
});
