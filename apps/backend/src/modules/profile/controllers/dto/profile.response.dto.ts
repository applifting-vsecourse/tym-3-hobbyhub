import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import { LevelResponseDto } from '@/modules/level/controllers/dto/level.response.dto';
import {
  HomeAddressResponseDto,
  InterestResponseDto,
} from '@/modules/onboarding/controllers/dto/onboarding.response.dto';
import { Profile, PublicProfile } from '@/modules/profile/domain/profile';
import { GENDERS } from '@/shared/auth/registration/registration';
import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ description: 'The public nickname' })
  name!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  joinedAt!: Date;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'WebP data URL of the photo',
  })
  image!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Cover id, null = default',
  })
  cover!: string | null;

  @ApiProperty({ enum: GENDERS, nullable: true, description: 'Private' })
  gender!: (typeof GENDERS)[number] | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '1990-05-17',
    description: 'Private',
  })
  birthDate!: string | null;

  @ApiProperty({ type: [InterestResponseDto] })
  interests!: InterestResponseDto[];

  @ApiProperty({ type: HomeAddressResponseDto, nullable: true })
  address!: HomeAddressResponseDto | null;

  static fromDomain(profile: Profile): ProfileResponseDto {
    return {
      name: profile.name,
      joinedAt: profile.joinedAt,
      bio: profile.bio,
      image: profile.image,
      cover: profile.cover,
      gender: profile.gender,
      birthDate: profile.birthDate,
      interests: profile.interests.map((interest) => ({
        activity: ActivityResponseDto.fromDomain(interest.activity),
        level: interest.level
          ? LevelResponseDto.fromDomain(interest.level)
          : null,
      })),
      address: profile.address ? { ...profile.address } : null,
    };
  }
}

export class PublicProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'The public nickname' })
  name!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  joinedAt!: Date;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'WebP data URL of the photo',
  })
  image!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Cover id, null = default',
  })
  cover!: string | null;

  @ApiProperty({ type: [InterestResponseDto] })
  interests!: InterestResponseDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Only for an organizer of an event the person is approved on, else null',
  })
  email!: string | null;

  static fromDomain(profile: PublicProfile): PublicProfileResponseDto {
    return {
      id: profile.id,
      name: profile.name,
      joinedAt: profile.joinedAt,
      bio: profile.bio,
      image: profile.image,
      cover: profile.cover,
      interests: profile.interests.map((interest) => ({
        activity: ActivityResponseDto.fromDomain(interest.activity),
        level: interest.level
          ? LevelResponseDto.fromDomain(interest.level)
          : null,
      })),
      email: profile.email,
    };
  }
}
