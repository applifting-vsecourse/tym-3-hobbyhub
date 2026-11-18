import { CharLength } from '@/core/validation/char-length.decorator';
import {
  GROUP_APPROVAL_MODES,
  GROUP_DESCRIPTION_MAX_LENGTH,
  GROUP_LOCATION_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
  GROUP_SCHEDULE_MAX_LENGTH,
} from '@/modules/group/domain/group';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Optional text: whitespace only counts as not filled in.
const trimToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CreateGroupDto {
  @ApiProperty({
    example: 'Čtvrteční florbalisté',
    minLength: GROUP_NAME_MIN_LENGTH,
    maxLength: GROUP_NAME_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString()
  @CharLength(GROUP_NAME_MIN_LENGTH, GROUP_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ description: 'Id from GET /api/activities' })
  @IsString()
  @IsNotEmpty()
  activityId!: string;

  @ApiProperty({
    example: 'Hrajeme každý čtvrtek, nováčci vítáni.',
    maxLength: GROUP_DESCRIPTION_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @CharLength(0, GROUP_DESCRIPTION_MAX_LENGTH)
  description!: string;

  @ApiPropertyOptional({
    example: 'Praha 8',
    maxLength: GROUP_LOCATION_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, GROUP_LOCATION_MAX_LENGTH)
  locationName?: string;

  @ApiPropertyOptional({
    example: 'Čtvrtky 19:00',
    maxLength: GROUP_SCHEDULE_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, GROUP_SCHEDULE_MAX_LENGTH)
  usualSchedule?: string;

  @ApiPropertyOptional({
    enum: GROUP_APPROVAL_MODES,
    default: 'APPROVAL',
    description: 'OPEN lets anyone in at once; APPROVAL keeps the request',
  })
  @IsOptional()
  @IsIn(GROUP_APPROVAL_MODES)
  approvalMode?: (typeof GROUP_APPROVAL_MODES)[number];

  @ApiPropertyOptional({
    type: [Number],
    example: [4],
    description: 'ISO weekdays, 1 = Monday .. 7 = Sunday',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  meetingDays?: number[];

  @ApiPropertyOptional({ description: 'With longitude, or neither' })
  @ValidateIf((dto: CreateGroupDto) => dto.latitude !== undefined)
  @IsLatitude()
  @ValidateIf((dto: CreateGroupDto) => dto.longitude !== undefined)
  latitude?: number;

  @ApiPropertyOptional({ description: 'With latitude, or neither' })
  @ValidateIf((dto: CreateGroupDto) => dto.longitude !== undefined)
  @IsLongitude()
  longitude?: number;
}
