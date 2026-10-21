import { CharLength } from '@/core/validation/char-length.decorator';
import {
  ONBOARDING_BIO_MAX_LENGTH,
  ONBOARDING_CITY_MAX_LENGTH,
  ONBOARDING_STREET_MAX_LENGTH,
  TRAVEL_RADIUS_DEFAULT_KM,
  TRAVEL_RADIUS_MAX_KM,
  TRAVEL_RADIUS_MIN_KM,
} from '@/modules/onboarding/domain/onboarding';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Optional text: whitespace only counts as not filled in.
const trimToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

// A sanity cap, not a product limit: there are far fewer activities than this.
const MAX_ACTIVITIES = 100;

export class InterestDto {
  @ApiProperty({ description: 'Id from GET /api/activities' })
  @IsString()
  @IsNotEmpty()
  activityId!: string;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Id from GET /api/levels; how well the user plays it, optional',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  levelId?: string | null;
}

export class SaveActivitiesDto {
  @ApiProperty({ type: [InterestDto], description: 'At least one activity' })
  @IsArray()
  @ArrayMaxSize(MAX_ACTIVITIES)
  @ValidateNested({ each: true })
  @Type(() => InterestDto)
  items!: InterestDto[];
}

export class SaveLocationDto {
  @ApiProperty({ example: 'Praha 8', maxLength: ONBOARDING_CITY_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @CharLength(1, ONBOARDING_CITY_MAX_LENGTH)
  city!: string;

  @ApiPropertyOptional({
    example: 'Sokolovská 12',
    maxLength: ONBOARDING_STREET_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, ONBOARDING_STREET_MAX_LENGTH)
  street?: string;

  @ApiProperty({
    minimum: TRAVEL_RADIUS_MIN_KM,
    maximum: TRAVEL_RADIUS_MAX_KM,
    default: TRAVEL_RADIUS_DEFAULT_KM,
  })
  @IsInt()
  @Min(TRAVEL_RADIUS_MIN_KM)
  @Max(TRAVEL_RADIUS_MAX_KM)
  travelRadiusKm!: number;
}

export class SaveProfileDto {
  @ApiPropertyOptional({
    example: 'Hraju rok, rád zkusím nové aktivity.',
    maxLength: ONBOARDING_BIO_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, ONBOARDING_BIO_MAX_LENGTH)
  bio?: string;
}
