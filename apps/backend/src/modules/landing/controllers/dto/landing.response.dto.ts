import { EventListItemResponseDto } from '@/modules/event/controllers/dto/event-list-item.response.dto';
import { LandingCity } from '@/modules/event/domain/event';
import { GroupResponseDto } from '@/modules/group/controllers/dto/group.response.dto';
import {
  Landing,
  LANDING_ROW_KINDS,
  LandingEvent,
  LandingFriend,
  LandingGroup,
  LandingNear,
  LandingRow,
} from '@/modules/landing/domain/landing';
import { RatingScoreResponseDto } from '@/modules/rating/controllers/dto/rating.response.dto';
import { ApiProperty } from '@nestjs/swagger';

// A friend who allowed friends to see their upcoming events: the public
// profile only (visibility matrix).
export class LandingFriendResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'The nickname, the one public name (ADR-0025)' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  image!: string | null;

  static fromDomain(friend: LandingFriend): LandingFriendResponseDto {
    return { id: friend.id, name: friend.name, image: friend.image };
  }
}

export class LandingEventResponseDto extends EventListItemResponseDto {
  @ApiProperty({
    enum: ['JOINED', 'PENDING'],
    nullable: true,
    description:
      'The viewer holds a seat, or asked for one; null for a visitor or neither',
  })
  viewerState!: LandingEvent['viewerState'];

  @ApiProperty({
    type: [LandingFriendResponseDto],
    description:
      "The viewer's friends going who allow friends to see their upcoming events (ADR-0026); nobody else is counted",
  })
  friends!: LandingFriendResponseDto[];

  @ApiProperty({
    type: RatingScoreResponseDto,
    nullable: true,
    description:
      'The organizer\'s public score on "Top akce", from three revealed ratings; null for a visitor',
  })
  organizerScore!: RatingScoreResponseDto | null;

  static fromLanding(event: LandingEvent): LandingEventResponseDto {
    return {
      ...EventListItemResponseDto.fromDomain(event),
      viewerState: event.viewerState,
      friends: event.friends.map(LandingFriendResponseDto.fromDomain),
      organizerScore: event.organizerScore
        ? RatingScoreResponseDto.fromDomain(event.organizerScore)
        : null,
    };
  }
}

export class LandingGroupResponseDto extends GroupResponseDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Members who joined in the last 30 days; "Trendy skupiny" only',
  })
  recentMemberCount!: number | null;

  static fromLanding(group: LandingGroup): LandingGroupResponseDto {
    return {
      ...GroupResponseDto.fromDomain(group),
      recentMemberCount: group.recentMemberCount,
    };
  }
}

export class LandingRowResponseDto {
  @ApiProperty({ enum: LANDING_ROW_KINDS })
  kind!: LandingRow['kind'];

  @ApiProperty({
    enum: ['ok', 'error'],
    description: 'error: the row could not be loaded; the others are fine',
  })
  status!: LandingRow['status'];

  @ApiProperty({ type: [LandingEventResponseDto] })
  events!: LandingEventResponseDto[];

  @ApiProperty({ type: [LandingGroupResponseDto] })
  groups!: LandingGroupResponseDto[];

  static fromDomain(row: LandingRow): LandingRowResponseDto {
    return {
      kind: row.kind,
      status: row.status,
      events: row.events.map(LandingEventResponseDto.fromLanding),
      groups: row.groups.map(LandingGroupResponseDto.fromLanding),
    };
  }
}

export class LandingNearResponseDto {
  @ApiProperty({
    enum: ['radius', 'city'],
    description:
      'radius: around the home within the travel radius; city: in the city below',
  })
  mode!: LandingNear['mode'];

  @ApiProperty({ type: Number, nullable: true })
  radiusKm!: number | null;

  @ApiProperty({
    description: 'The picked city, or the home city with a radius',
  })
  city!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "The viewer's own home with a radius, for the link to the event list; null by city",
  })
  latitude!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  longitude!: number | null;

  static fromDomain(near: LandingNear): LandingNearResponseDto {
    return near.mode === 'radius'
      ? {
          mode: 'radius',
          radiusKm: near.radiusKm,
          city: near.city,
          latitude: near.latitude,
          longitude: near.longitude,
        }
      : {
          mode: 'city',
          radiusKm: null,
          city: near.city,
          latitude: null,
          longitude: null,
        };
  }
}

export class LandingCityResponseDto {
  @ApiProperty({ example: 'Praha' })
  city!: string;

  @ApiProperty({ description: 'Upcoming events with a free seat there' })
  eventCount!: number;

  static fromDomain(city: LandingCity): LandingCityResponseDto {
    return { city: city.city, eventCount: city.eventCount };
  }
}

export class LandingResponseDto {
  @ApiProperty({
    type: [LandingRowResponseDto],
    description:
      'In the order of the page; a row with nothing to show is left out',
  })
  rows!: LandingRowResponseDto[];

  @ApiProperty({ type: LandingNearResponseDto, nullable: true })
  near!: LandingNearResponseDto | null;

  @ApiProperty({
    type: [LandingCityResponseDto],
    description:
      'The cities to pick for "Ve tvém okolí" when it goes by city; empty otherwise',
  })
  cities!: LandingCityResponseDto[];

  @ApiProperty({
    type: [String],
    description:
      "The viewer's own profile activities, for the link of their row; empty for a visitor",
  })
  interestActivityIds!: string[];

  static fromDomain(landing: Landing): LandingResponseDto {
    return {
      rows: landing.rows.map(LandingRowResponseDto.fromDomain),
      near: landing.near
        ? LandingNearResponseDto.fromDomain(landing.near)
        : null,
      cities: landing.cities.map(LandingCityResponseDto.fromDomain),
      interestActivityIds: landing.interestActivityIds,
    };
  }
}
