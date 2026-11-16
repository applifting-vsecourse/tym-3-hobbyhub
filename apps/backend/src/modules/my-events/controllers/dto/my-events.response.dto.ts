import { EventListItemResponseDto } from '@/modules/event/controllers/dto/event-list-item.response.dto';
import { EventListItem, EventListPage } from '@/modules/event/domain/event';
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
    description:
      'All applications of the user that match the filter, not just this page',
  })
  total!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Offset of the next page; null on the last one',
  })
  nextOffset!: number | null;

  static fromDomain(page: MyApplicationPage): MyApplicationPageResponseDto {
    return {
      items: page.items.map(MyApplicationResponseDto.fromDomain),
      total: page.total,
      nextOffset: page.nextOffset,
    };
  }
}

// #239: the organizer's own list also holds what an administrator hid.
export class HostedEventResponseDto extends EventListItemResponseDto {
  @ApiProperty({ description: 'Hidden by an administrator (#239)' })
  isHidden!: boolean;

  static fromHosted(event: EventListItem): HostedEventResponseDto {
    return {
      ...EventListItemResponseDto.fromDomain(event),
      isHidden: event.isHidden,
    };
  }
}

export class MyHostedEventsResponseDto {
  @ApiProperty({ type: [HostedEventResponseDto] })
  items!: HostedEventResponseDto[];

  @ApiProperty({
    description:
      'All events the user organizes that match the filter, not just this page',
  })
  total!: number;

  static fromDomain(page: EventListPage): MyHostedEventsResponseDto {
    return {
      items: page.items.map((event) =>
        HostedEventResponseDto.fromHosted(event),
      ),
      total: page.total,
    };
  }
}
