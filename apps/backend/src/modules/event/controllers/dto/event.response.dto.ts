import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import { Event, EventLocation } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';

export class EventLocationResponseDto {
  @ApiProperty()
  street!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  postalCode!: string;

  @ApiProperty()
  country!: string;

  @ApiProperty({ type: String, nullable: true })
  placeName!: string | null;

  static fromDomain(location: EventLocation): EventLocationResponseDto {
    return {
      street: location.street,
      city: location.city,
      postalCode: location.postalCode,
      country: location.country,
      placeName: location.placeName,
    };
  }
}

export class EventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, nullable: true })
  equipment!: string | null;

  @ApiProperty({
    enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'FINISHED', 'NOT_HELD'],
  })
  status!: Event['status'];

  @ApiProperty({ enum: ['PUBLIC', 'GROUP_ONLY', 'PRIVATE'] })
  visibility!: Event['visibility'];

  @ApiProperty({ enum: ['PUBLIC_VENUE', 'PRIVATE_VENUE', 'ONLINE'] })
  venueType!: Event['venueType'];

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  endAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty()
  minParticipants!: number;

  @ApiProperty()
  maxParticipants!: number;

  @ApiProperty({ description: 'Seats taken by people outside the app' })
  externalOccupiedSpots!: number;

  @ApiProperty({ description: 'Approved participants in the app' })
  approvedCount!: number;

  @ApiProperty({ description: 'externalOccupiedSpots + approvedCount' })
  occupiedSpots!: number;

  @ApiProperty()
  missingToMinimum!: number;

  @ApiProperty()
  freeSpots!: number;

  @ApiProperty({ enum: ['BELOW_MINIMUM', 'MINIMUM_REACHED', 'FULL'] })
  fillState!: Event['fillState'];

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Contribution per seat in CZK, information only',
  })
  contributionAmount!: number | null;

  @ApiProperty({ type: String, nullable: true })
  contributionNote!: string | null;

  @ApiProperty({ type: EventLocationResponseDto, nullable: true })
  location!: EventLocationResponseDto | null;

  @ApiProperty({ type: ActivityResponseDto })
  activity!: ActivityResponseDto;

  @ApiProperty()
  organizerId!: string;

  @ApiProperty({ type: String, nullable: true })
  cancellationReason!: string | null;

  @ApiProperty({ type: String, nullable: true })
  cancellationNote!: string | null;

  static fromDomain(event: Event): EventResponseDto {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      equipment: event.equipment,
      status: event.status,
      visibility: event.visibility,
      venueType: event.venueType,
      startAt: event.startAt,
      endAt: event.endAt,
      publishedAt: event.publishedAt,
      createdAt: event.createdAt,
      minParticipants: event.minParticipants,
      maxParticipants: event.maxParticipants,
      externalOccupiedSpots: event.externalOccupiedSpots,
      approvedCount: event.approvedCount,
      occupiedSpots: event.occupiedSpots,
      missingToMinimum: event.missingToMinimum,
      freeSpots: event.freeSpots,
      fillState: event.fillState,
      contributionAmount: event.contributionAmount,
      contributionNote: event.contributionNote,
      location: event.location
        ? EventLocationResponseDto.fromDomain(event.location)
        : null,
      activity: ActivityResponseDto.fromDomain(event.activity),
      organizerId: event.organizerId,
      cancellationReason: event.cancellationReason,
      cancellationNote: event.cancellationNote,
    };
  }
}
