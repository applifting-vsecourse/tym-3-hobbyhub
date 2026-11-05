import { EventListItemResponseDto } from '@/modules/event/controllers/dto/event-list-item.response.dto';
import {
  ApplicationStatus,
  MyApplication,
  MyEventsOverview,
} from '@/modules/my-events/domain/my-events';
import { ApiProperty } from '@nestjs/swagger';

export class MyApplicationResponseDto {
  @ApiProperty({
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'EVENT_CANCELLED'],
  })
  status!: ApplicationStatus;

  @ApiProperty({ type: EventListItemResponseDto })
  event!: EventListItemResponseDto;

  static fromDomain(application: MyApplication): MyApplicationResponseDto {
    return {
      status: application.status,
      event: EventListItemResponseDto.fromDomain(application.event),
    };
  }
}

export class MyEventsResponseDto {
  @ApiProperty({
    type: [MyApplicationResponseDto],
    description: 'Applications to events that are not over, soonest first',
  })
  applications!: MyApplicationResponseDto[];

  @ApiProperty({
    type: [EventListItemResponseDto],
    description: 'Published events the user organizes that are not over',
  })
  hosted!: EventListItemResponseDto[];

  static fromDomain(overview: MyEventsOverview): MyEventsResponseDto {
    return {
      applications: overview.applications.map(
        MyApplicationResponseDto.fromDomain,
      ),
      hosted: overview.hosted.map(EventListItemResponseDto.fromDomain),
    };
  }
}
