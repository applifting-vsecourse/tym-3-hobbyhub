import { CharLength } from '@/core/validation/char-length.decorator';
import { PROFILE_BIO_MAX_LENGTH } from '@/modules/profile/domain/profile';
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
} from '@/shared/auth/registration/nickname';
import {
  GENDERS,
  OLDEST_BIRTH_YEAR,
} from '@/shared/auth/registration/registration';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// Whitespace only counts as not filled in: it clears the bio.
const trimToNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

export class UpdateProfileDto {
  // #212: the unique nickname. The allowed characters, reserved words, whether
  // it is free and the 30 days between changes are the service's rules, which
  // answer with codes (ADR-0025).
  @ApiPropertyOptional({
    minLength: NICKNAME_MIN_LENGTH,
    maxLength: NICKNAME_MAX_LENGTH,
    description:
      'The nickname: a-z, 0-9, "_" and "."; unique regardless of letter case; changed at most once in 30 days',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @CharLength(NICKNAME_MIN_LENGTH, NICKNAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: PROFILE_BIO_MAX_LENGTH,
    description: 'null or empty clears the bio',
  })
  @Transform(trimToNull)
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @CharLength(1, PROFILE_BIO_MAX_LENGTH)
  bio?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Photo as a WebP data URL (data:image/webp;base64,…), at most 2 MB, or an illustration "avatar:<name>"; null removes it',
  })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  image?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      "The picture on top of the profile: an id from the app's covers or a WebP data URL, at most 2 MB; null = the default",
  })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  cover?: string | null;
}

export class UpdatePrivateDetailsDto {
  @ApiProperty({ enum: GENDERS })
  @IsIn(GENDERS)
  gender!: (typeof GENDERS)[number];

  @ApiProperty({
    example: 1990,
    minimum: OLDEST_BIRTH_YEAR,
    description:
      'Year of birth, never the full date; at most the year of turning 18',
  })
  @IsInt()
  @Min(OLDEST_BIRTH_YEAR)
  birthYear!: number;
}
