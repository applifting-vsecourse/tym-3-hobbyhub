import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import { EventListItem } from '@/modules/event/domain/event';
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
