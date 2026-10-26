import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import { LevelResponseDto } from '@/modules/level/controllers/dto/level.response.dto';
import { Onboarding } from '@/modules/onboarding/domain/onboarding';
import { ApiProperty } from '@nestjs/swagger';

export class InterestResponseDto {
  @ApiProperty({ type: ActivityResponseDto })
  activity!: ActivityResponseDto;

  @ApiProperty({ type: LevelResponseDto, nullable: true })
  level!: LevelResponseDto | null;
}

export class HomeAddressResponseDto {
  @ApiProperty()
  street!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  postalCode!: string;

  @ApiProperty()
  country!: string;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;
}

export class OnboardingResponseDto {
  @ApiProperty({ description: 'Steps done or skipped, 0 to 3' })
  stepsDone!: number;

  @ApiProperty({
    description:
      'The wizard ended but the profile has no activities or no home address yet',
  })
  skipped!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Set once the wizard ended, finished or skipped',
  })
  completedAt!: Date | null;

  @ApiProperty({ type: [InterestResponseDto] })
  interests!: InterestResponseDto[];

  @ApiProperty({ type: HomeAddressResponseDto, nullable: true })
  address!: HomeAddressResponseDto | null;

  @ApiProperty({ type: Number, nullable: true })
  travelRadiusKm!: number | null;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;

  static fromDomain(onboarding: Onboarding): OnboardingResponseDto {
    return {
      stepsDone: onboarding.stepsDone,
      skipped: onboarding.skipped,
      completedAt: onboarding.completedAt,
      interests: onboarding.interests.map((interest) => ({
        activity: ActivityResponseDto.fromDomain(interest.activity),
        level: interest.level
          ? LevelResponseDto.fromDomain(interest.level)
          : null,
      })),
      address: onboarding.address ? { ...onboarding.address } : null,
      travelRadiusKm: onboarding.travelRadiusKm,
      bio: onboarding.bio,
    };
  }
}
