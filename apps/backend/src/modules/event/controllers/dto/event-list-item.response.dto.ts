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

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Contribution per seat in CZK, information only',
  })
  contributionAmount!: number | null;

  @ApiProperty({ enum: ['PUBLISHED', 'CANCELLED', 'FINISHED', 'NOT_HELD'] })
  status!: EventDetail['status'];

  @ApiProperty({ enum: ['MANUAL', 'AUTOMATIC'] })
  approvalMode!: EventDetail['approvalMode'];

  @ApiProperty()
  organizerName!: string;

  @ApiProperty({
    type: ParticipantStatsResponseDto,
    nullable: true,
    description: 'Hidden until enough participants are included',
  })
  stats!: ParticipantStatsResponseDto | null;

  static fromDomainDetail(event: EventDetail): EventDetailResponseDto {
    return {
      ...EventListItemResponseDto.fromDomain(event),
      description: event.description,
      equipment: event.equipment,
      contributionAmount: event.contributionAmount,
      status: event.status,
      approvalMode: event.approvalMode,
      organizerName: event.organizerName,
      stats: event.stats
        ? ParticipantStatsResponseDto.fromDomain(event.stats)
        : null,
    };
  }
}
