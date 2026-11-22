import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import {
  EventDetail,
  EventListItem,
  EventListPage,
  ParticipantStats,
  VENUE_TYPES,
} from '@/modules/event/domain/event';
import { RatingScoreResponseDto } from '@/modules/rating/controllers/dto/rating.response.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventLocationResponseDto } from './event.response.dto';

class EventGroupResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class EventListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: String, nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt!: Date;

  @ApiProperty({ enum: VENUE_TYPES })
  venueType!: EventListItem['venueType'];

  @ApiProperty({
    description:
      'Whether the organizer made the exact address public (#218); otherwise the place is not named and has no position',
  })
  isAddressPublic!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Only for a public address; a hidden one is not named',
  })
  placeName!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Praha 8' })
  district!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Praha' })
  city!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Pokročilí' })
  level!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Only for public venues that have coordinates; private ones are not located',
  })
  latitude!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  longitude!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Km from the visitor (lat and lng sent); otherwise null',
  })
  distanceKm!: number | null;

  @ApiProperty({ type: ActivityResponseDto })
  activity!: ActivityResponseDto;

  @ApiProperty({ description: 'People needed for the event to happen' })
  minParticipants!: number;

  @ApiProperty()
  maxParticipants!: number;

  @ApiProperty({
    description: 'Approved participants plus people brought by the organizer',
  })
  takenCount!: number;

  @ApiProperty()
  organizerName!: string;

  @ApiProperty({
    type: EventGroupResponseDto,
    nullable: true,
    description: 'The public group that organizes the event, if any',
  })
  group!: EventGroupResponseDto | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Contribution per seat in CZK, information only',
  })
  contributionAmount!: number | null;

  static fromDomain(event: EventListItem): EventListItemResponseDto {
    return {
      id: event.id,
      title: event.title,
      imageUrl: event.imageUrl,
      startAt: event.startAt,
      endAt: event.endAt,
      venueType: event.venueType,
      isAddressPublic: event.isAddressPublic,
      placeName: event.placeName,
      district: event.district,
      city: event.city,
      level: event.level,
      latitude: event.latitude,
      longitude: event.longitude,
      distanceKm: event.distanceKm,
      activity: ActivityResponseDto.fromDomain(event.activity),
      minParticipants: event.minParticipants,
      maxParticipants: event.maxParticipants,
      takenCount: event.takenCount,
      organizerName: event.organizerName,
      group: event.group,
      contributionAmount: event.contributionAmount,
    };
  }
}

export class EventListResponseDto {
  @ApiProperty({ type: [EventListItemResponseDto] })
  items!: EventListItemResponseDto[];

  @ApiProperty({
    description: 'All upcoming public events, not just this page',
  })
  total!: number;

  @ApiPropertyOptional({
    description:
      'Only with a radius filter: events that fit every other filter but have no position, so they are left out',
  })
  withoutLocationCount?: number;

  static fromDomain(page: EventListPage): EventListResponseDto {
    return {
      items: page.items.map(EventListItemResponseDto.fromDomain),
      total: page.total,
      withoutLocationCount: page.withoutLocationCount,
    };
  }
}

export class SimilarEventsResponseDto {
  @ApiProperty({ type: [EventListItemResponseDto] })
  items!: EventListItemResponseDto[];

  static fromDomain(items: EventListItem[]): SimilarEventsResponseDto {
    return { items: items.map(EventListItemResponseDto.fromDomain) };
  }
}

class GenderSplitDto {
  @ApiProperty()
  male!: number;

  @ApiProperty()
  female!: number;

  @ApiProperty({
    description:
      'Taken seats without a known gender, people outside the app included',
  })
  unknown!: number;
}

export class ParticipantStatsResponseDto {
  @ApiProperty({
    description: 'Registered approved participants the figures rest on',
  })
  included!: number;

  @ApiProperty({
    description: 'All taken seats, including people outside the app',
  })
  total!: number;

  @ApiProperty({ type: Number, nullable: true })
  medianAge!: number | null;

  @ApiProperty({ type: GenderSplitDto, nullable: true })
  gender!: GenderSplitDto | null;

  static fromDomain(stats: ParticipantStats): ParticipantStatsResponseDto {
    return { ...stats };
  }
}

export class EventDetailResponseDto extends EventListItemResponseDto {
  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, nullable: true })
  equipment!: string | null;

  @ApiProperty({ type: String, nullable: true })
  contributionNote!: string | null;

  @ApiProperty({ enum: ['PUBLISHED', 'CANCELLED', 'FINISHED', 'NOT_HELD'] })
  status!: EventDetail['status'];

  @ApiProperty({ enum: ['MANUAL', 'AUTOMATIC'] })
  approvalMode!: EventDetail['approvalMode'];

  @ApiProperty({
    description: 'Lets the client offer editing to the organizer',
  })
  organizerId!: string;

  @ApiProperty({ type: String, nullable: true })
  cancellationReason!: string | null;

  @ApiProperty({ type: String, nullable: true })
  cancellationNote!: string | null;

  @ApiProperty({
    enum: ['PUBLIC', 'GROUP_ONLY'],
    description: 'GROUP_ONLY: shown to the members of its group only',
  })
  visibility!: EventDetail['visibility'];

  @ApiProperty({
    type: ParticipantStatsResponseDto,
    nullable: true,
    description: 'Hidden until enough participants are included',
  })
  stats!: ParticipantStatsResponseDto | null;

  @ApiProperty({
    description: 'Included participants needed before stats are shown',
  })
  statsMinParticipants!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Why an administrator hid the event (#239). Only its organizers ever get a hidden event; null for everyone else',
  })
  hiddenReason!: string | null;

  @ApiProperty({
    type: RatingScoreResponseDto,
    description:
      "The participants' revealed ratings of the event (#236); both null below 3 ratings",
  })
  rating!: RatingScoreResponseDto;

  @ApiProperty({
    type: EventLocationResponseDto,
    nullable: true,
    description:
      'The exact address, when the organizer made it public (#218); null otherwise, when only the people with a seat get it from /participant-info',
  })
  location!: EventLocationResponseDto | null;

  static fromDomainDetail(event: EventDetail): EventDetailResponseDto {
    return {
      ...EventListItemResponseDto.fromDomain(event),
      description: event.description,
      equipment: event.equipment,
      contributionNote: event.contributionNote,
      status: event.status,
      approvalMode: event.approvalMode,
      organizerId: event.organizerId,
      cancellationReason: event.cancellationReason,
      cancellationNote: event.cancellationNote,
      visibility: event.visibility,
      stats: event.stats
        ? ParticipantStatsResponseDto.fromDomain(event.stats)
        : null,
      statsMinParticipants: event.statsMinParticipants,
      hiddenReason: event.hiddenReason,
      rating: RatingScoreResponseDto.fromDomain(event.rating),
      location: event.location
        ? EventLocationResponseDto.fromDomain(event.location)
        : null,
    };
  }
}
