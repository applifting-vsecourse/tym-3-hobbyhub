import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import {
  EventDetail,
  EventListItem,
  EventListPage,
  ParticipantStats,
} from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ enum: ['PUBLIC_VENUE', 'PRIVATE_VENUE', 'ONLINE'] })
  venueType!: EventListItem['venueType'];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Only for public venues; private ones are not named',
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

  static fromDomain(event: EventListItem): EventListItemResponseDto {
    return {
      id: event.id,
      title: event.title,
      imageUrl: event.imageUrl,
      startAt: event.startAt,
      endAt: event.endAt,
      venueType: event.venueType,
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

  static fromDomain(page: EventListPage): EventListResponseDto {
    return {
      items: page.items.map(EventListItemResponseDto.fromDomain),
      total: page.total,
    };
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

class EventGroupResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class EventDetailResponseDto extends EventListItemResponseDto {
  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, nullable: true })
  equipment!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Contribution per seat in CZK, information only',
  })
  contributionAmount!: number | null;

  @ApiProperty({ type: String, nullable: true })
  contributionNote!: string | null;

  @ApiProperty({ enum: ['PUBLISHED', 'CANCELLED', 'FINISHED', 'NOT_HELD'] })
  status!: EventDetail['status'];

  @ApiProperty({ enum: ['MANUAL', 'AUTOMATIC'] })
  approvalMode!: EventDetail['approvalMode'];

  @ApiProperty()
  organizerName!: string;

  @ApiProperty({
    type: EventGroupResponseDto,
    nullable: true,
    description: 'The public group that organizes the event, if any',
  })
  group!: EventGroupResponseDto | null;

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

  static fromDomainDetail(event: EventDetail): EventDetailResponseDto {
    return {
      ...EventListItemResponseDto.fromDomain(event),
      description: event.description,
      equipment: event.equipment,
      contributionAmount: event.contributionAmount,
      contributionNote: event.contributionNote,
      status: event.status,
      approvalMode: event.approvalMode,
      organizerName: event.organizerName,
      group: event.group,
      stats: event.stats
        ? ParticipantStatsResponseDto.fromDomain(event.stats)
        : null,
      statsMinParticipants: event.statsMinParticipants,
    };
  }
}
