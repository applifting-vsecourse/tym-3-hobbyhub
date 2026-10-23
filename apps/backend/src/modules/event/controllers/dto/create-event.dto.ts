import { CharLength } from '@/core/validation/char-length.decorator';
import {
  CREATABLE_VENUE_TYPES,
  CreatableVenueType,
  EVENT_CITY_MAX_LENGTH,
  EVENT_CONTRIBUTION_MAX_AMOUNT,
  EVENT_CONTRIBUTION_NOTE_MAX_LENGTH,
  EVENT_COUNTRY_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_EQUIPMENT_MAX_LENGTH,
  EVENT_PARTICIPANTS_LIMIT,
  EVENT_PLACE_NAME_MAX_LENGTH,
  EVENT_POSTAL_CODE_MAX_LENGTH,
  EVENT_STREET_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  EVENT_TITLE_MIN_LENGTH,
} from '@/modules/event/domain/event';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsDefined,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Optional text: whitespace only counts as not filled in.
const trimToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CreateEventLocationDto {
  @ApiProperty({
    example: 'Chabařovická 4',
    maxLength: EVENT_STREET_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @CharLength(1, EVENT_STREET_MAX_LENGTH)
  street!: string;

  @ApiProperty({ example: 'Praha 8', maxLength: EVENT_CITY_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @CharLength(1, EVENT_CITY_MAX_LENGTH)
  city!: string;

  @ApiProperty({ example: '182 00', maxLength: EVENT_POSTAL_CODE_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @CharLength(1, EVENT_POSTAL_CODE_MAX_LENGTH)
  postalCode!: string;

  @ApiProperty({ example: 'Česko', maxLength: EVENT_COUNTRY_MAX_LENGTH })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @CharLength(1, EVENT_COUNTRY_MAX_LENGTH)
  country!: string;

  @ApiPropertyOptional({
    example: 'ZŠ Kobylisy',
    maxLength: EVENT_PLACE_NAME_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, EVENT_PLACE_NAME_MAX_LENGTH)
  placeName?: string;

  @ApiPropertyOptional({
    example: 50.1297,
    minimum: -90,
    maximum: 90,
    description:
      'Position of the address, from the address suggestions; sent with `longitude` or not at all',
  })
  @ValidateIf(
    (location: CreateEventLocationDto) => location.longitude !== undefined,
  )
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 14.4421, minimum: -180, maximum: 180 })
  @ValidateIf(
    (location: CreateEventLocationDto) => location.latitude !== undefined,
  )
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}

export class CreateEventDto {
  @ApiProperty({
    example: 'Čtvrteční florbal',
    minLength: EVENT_TITLE_MIN_LENGTH,
    maxLength: EVENT_TITLE_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString()
  @CharLength(EVENT_TITLE_MIN_LENGTH, EVENT_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty({ description: 'Id from GET /api/activities' })
  @IsString()
  @IsNotEmpty()
  activityId!: string;

  @ApiProperty({
    example: 'Rekreační hra pro mírně pokročilé.',
    maxLength: EVENT_DESCRIPTION_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @CharLength(0, EVENT_DESCRIPTION_MAX_LENGTH)
  description!: string;

  @ApiPropertyOptional({
    example: 'Vlastní hokejka, sálová obuv',
    maxLength: EVENT_EQUIPMENT_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, EVENT_EQUIPMENT_MAX_LENGTH)
  equipment?: string;

  @ApiProperty({
    enum: CREATABLE_VENUE_TYPES,
    description: 'ONLINE is not offered yet (ADR-0006)',
  })
  @IsIn(CREATABLE_VENUE_TYPES)
  venueType!: CreatableVenueType;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endAt!: Date;

  @ApiProperty({ type: CreateEventLocationDto })
  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => CreateEventLocationDto)
  location!: CreateEventLocationDto;

  @ApiProperty({ example: 8, minimum: 1, maximum: EVENT_PARTICIPANTS_LIMIT })
  @IsInt()
  @Min(1)
  @Max(EVENT_PARTICIPANTS_LIMIT)
  minParticipants!: number;

  @ApiProperty({ example: 12, minimum: 1, maximum: EVENT_PARTICIPANTS_LIMIT })
  @IsInt()
  @Min(1)
  @Max(EVENT_PARTICIPANTS_LIMIT)
  maxParticipants!: number;

  @ApiProperty({
    example: 4,
    minimum: 0,
    description: 'Seats taken by people outside the app, organizer included',
  })
  @IsInt()
  @Min(0)
  @Max(EVENT_PARTICIPANTS_LIMIT)
  externalOccupiedSpots!: number;

  @ApiPropertyOptional({
    example: 80,
    minimum: 0,
    description: 'Contribution per seat in CZK, information only',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(EVENT_CONTRIBUTION_MAX_AMOUNT)
  contributionAmount?: number;

  @ApiPropertyOptional({
    example: 'Platí se na místě hotově',
    maxLength: EVENT_CONTRIBUTION_NOTE_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, EVENT_CONTRIBUTION_NOTE_MAX_LENGTH)
  contributionNote?: string;
}
