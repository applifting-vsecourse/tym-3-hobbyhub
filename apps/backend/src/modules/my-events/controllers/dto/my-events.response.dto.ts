import {
  EventListItemResponseDto,
  EventListResponseDto,
} from '@/modules/event/controllers/dto/event-list-item.response.dto';
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  MyApplication,
  MyApplicationPage,
} from '@/modules/my-events/domain/my-events';
import { ApiProperty } from '@nestjs/swagger';

export class MyApplicationResponseDto {
  @ApiProperty({ enum: APPLICATION_STATUSES })
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

export class MyApplicationPageResponseDto {
  @ApiProperty({ type: [MyApplicationResponseDto] })
  items!: MyApplicationResponseDto[];

  @ApiProperty({
    description: 'All upcoming applications of the user, not just this page',
  })
  total!: number;

  static fromDomain(page: MyApplicationPage): MyApplicationPageResponseDto {
    return {
      items: page.items.map(MyApplicationResponseDto.fromDomain),
      total: page.total,
    };
  }
}

// The events the user organizes page like the event list.
export { EventListResponseDto as MyHostedEventsResponseDto };
