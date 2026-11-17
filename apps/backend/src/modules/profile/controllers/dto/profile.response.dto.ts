import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import { PersonEventPageResponseDto } from '@/modules/event/controllers/dto/friend-events.response.dto';
import {
  FRIEND_RELATIONS,
  FriendRelation,
} from '@/modules/friendship/domain/friendship';
import { LevelResponseDto } from '@/modules/level/controllers/dto/level.response.dto';
import {
  HomeAddressResponseDto,
  InterestResponseDto,
} from '@/modules/onboarding/controllers/dto/onboarding.response.dto';
import { Profile, PublicProfile } from '@/modules/profile/domain/profile';
import { GENDERS } from '@/shared/auth/registration/registration';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ description: 'The public nickname, unique' })
  name!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Private: when the nickname may be changed again; null = it may be changed now',
  })
  nicknameChangeableFrom!: Date | null;

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
    type: Number,
    nullable: true,
    example: 1990,
    description: 'Private; the year only, never the full date',
  })
  birthYear!: number | null;

  @ApiProperty({ type: [InterestResponseDto] })
  interests!: InterestResponseDto[];

  @ApiProperty({ type: HomeAddressResponseDto, nullable: true })
  address!: HomeAddressResponseDto | null;

  @ApiProperty({
    description:
      'Private: whether friends see the past events (approved participations and organized events)',
  })
  friendsSeeEventHistory!: boolean;

  @ApiProperty({
    description:
      "Private: whether friends see the upcoming events, and the user's name in an event's detail",
  })
  friendsSeeUpcomingEvents!: boolean;

  static fromDomain(profile: Profile): ProfileResponseDto {
    return {
      name: profile.name,
      nicknameChangeableFrom: profile.nicknameChangeableFrom,
      joinedAt: profile.joinedAt,
      bio: profile.bio,
      image: profile.image,
      cover: profile.cover,
      gender: profile.gender,
      birthYear: profile.birthYear,
      interests: profile.interests.map((interest) => ({
        activity: ActivityResponseDto.fromDomain(interest.activity),
        level: interest.level
          ? LevelResponseDto.fromDomain(interest.level)
          : null,
      })),
      address: profile.address ? { ...profile.address } : null,
      friendsSeeEventHistory: profile.friendVisibility.friendsSeeEventHistory,
      friendsSeeUpcomingEvents:
        profile.friendVisibility.friendsSeeUpcomingEvents,
    };
  }
}

export class PublicProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'The public nickname' })
  name!: string;

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
    enum: FRIEND_RELATIONS,
    description:
      "#225: the viewer's relation to the person: none, request_sent, request_received, friends",
  })
  relation!: FriendRelation;

  @ApiPropertyOptional({
    type: PersonEventPageResponseDto,
    description:
      '#226: the first page of upcoming events (approved seat or organized). Only for a friend whose switch allows it; absent otherwise',
  })
  upcomingEvents?: PersonEventPageResponseDto;

  @ApiPropertyOptional({
    type: PersonEventPageResponseDto,
    description:
      '#226: the first page of past events (seat or organized). Only for a friend whose switch allows it; absent otherwise',
  })
  pastEvents?: PersonEventPageResponseDto;

  static fromDomain(profile: PublicProfile): PublicProfileResponseDto {
    return {
      id: profile.id,
      name: profile.name,
      relation: profile.relation,
      bio: profile.bio,
      image: profile.image,
      cover: profile.cover,
      interests: profile.interests.map((interest) => ({
        activity: ActivityResponseDto.fromDomain(interest.activity),
        level: interest.level
          ? LevelResponseDto.fromDomain(interest.level)
          : null,
      })),
      ...(profile.upcomingEvents && {
        upcomingEvents: PersonEventPageResponseDto.fromDomain(
          profile.upcomingEvents,
        ),
      }),
      ...(profile.pastEvents && {
        pastEvents: PersonEventPageResponseDto.fromDomain(profile.pastEvents),
      }),
    };
  }
}
