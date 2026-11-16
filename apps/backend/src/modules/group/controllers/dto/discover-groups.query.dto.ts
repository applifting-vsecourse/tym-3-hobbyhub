import {
  GROUP_LIST_LOCATION_MAX_LENGTH,
  GROUP_LIST_MAX_ACTIVITY_FILTERS,
  GROUP_LIST_SEARCH_MAX_LENGTH,
} from '@/modules/group/domain/group';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class DiscoverGroupsQueryDto {
  @ApiPropertyOptional({ description: '`nextCursor` from the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Only groups of these activities (repeat the parameter); none means all',
  })
  @IsOptional()
  // One value arrives as a string, several as an array.
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayMaxSize(GROUP_LIST_MAX_ACTIVITY_FILTERS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  activityIds: string[] = [];

  @ApiPropertyOptional({
    maxLength: GROUP_LIST_SEARCH_MAX_LENGTH,
    description: 'Part of the name, place or activity; ignores case',
  })
  @IsOptional()
  @IsString()
  @MaxLength(GROUP_LIST_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    maxLength: GROUP_LIST_LOCATION_MAX_LENGTH,
    description: 'Part of the place; ignores case',
  })
  @IsOptional()
  @IsString()
  @MaxLength(GROUP_LIST_LOCATION_MAX_LENGTH)
  location?: string;
}
