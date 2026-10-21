import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import {
  Interest,
  Onboarding,
  SKILL_LEVELS,
} from '@/modules/onboarding/domain/onboarding';
import { ApiProperty } from '@nestjs/swagger';

export class InterestResponseDto {
  @ApiProperty({ type: ActivityResponseDto })
  activity!: ActivityResponseDto;

  @ApiProperty({ enum: SKILL_LEVELS, nullable: true })
  level!: Interest['level'];
}

export class OnboardingResponseDto {
  @ApiProperty({ description: 'Steps done or skipped, 0 to 3' })
  stepsDone!: number;

  @ApiProperty({
    description:
      'The wizard ended but the profile has no activities or no location yet',
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

  @ApiProperty({ type: String, nullable: true })
  city!: string | null;

  @ApiProperty({ type: String, nullable: true })
  street!: string | null;

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
        level: interest.level,
      })),
      city: onboarding.city,
      street: onboarding.street,
      travelRadiusKm: onboarding.travelRadiusKm,
      bio: onboarding.bio,
    };
  }
}
