import {
  GROUP_APPROVAL_MODES,
  GROUP_LIST_LOCATION_MAX_LENGTH,
  GROUP_LIST_MAX_ACTIVITY_FILTERS,
  GROUP_LIST_SEARCH_MAX_LENGTH,
} from '@/modules/group/domain/group';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const toBoolean = ({ value }: { value: unknown }): unknown => {
  const text = String(value).toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  return value;
};

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

  @ApiPropertyOptional({
    type: [Number],
    description: 'Meets on any of these ISO weekdays (repeat the parameter)',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    (Array.isArray(value) ? value : [value]).map(Number),
  )
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays?: number[];

  @ApiPropertyOptional({ enum: GROUP_APPROVAL_MODES })
  @IsOptional()
  @IsIn(GROUP_APPROVAL_MODES)
  approvalMode?: (typeof GROUP_APPROVAL_MODES)[number];

  @ApiPropertyOptional({ description: 'Only groups with a public event ahead' })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  onlyWithUpcomingEvent?: boolean;

  @ApiPropertyOptional({ description: 'With lng and radiusKm' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiPropertyOptional({ description: 'With lat and radiusKm' })
  @ValidateIf((dto: DiscoverGroupsQueryDto) => dto.lat !== undefined)
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  radiusKm?: number;

  @ApiPropertyOptional({ enum: ['newest', 'nearest', 'members'] })
  @IsOptional()
  @IsIn(['newest', 'nearest', 'members'])
  sort?: 'newest' | 'nearest' | 'members';
}
