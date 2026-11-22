import {
  INTERESTED_EVENT_STATES,
  InterestedEventState,
} from '@/modules/event-interest/domain/event-interest';
import { EventListItemResponseDto } from '@/modules/event/controllers/dto/event-list-item.response.dto';
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  MyApplication,
  MyApplicationPage,
  MyHostedEvent,
  MyHostedEventPage,
  MyInterestedEvent,
  MyInterestedEventPage,
} from '@/modules/my-events/domain/my-events';
import { ApiProperty } from '@nestjs/swagger';

export class MyApplicationResponseDto {
  @ApiProperty({ enum: APPLICATION_STATUSES })
  status!: ApplicationStatus;

  @ApiProperty({ type: EventListItemResponseDto })
  event!: EventListItemResponseDto;

  @ApiProperty({
    description:
      'The event is over and the signed-in person may still rate its organizer (#234): they had a seat, the rating period is on and they have not rated yet',
  })
  canRateOrganizer!: boolean;

  static fromDomain(application: MyApplication): MyApplicationResponseDto {
    return {
      status: application.status,
      event: EventListItemResponseDto.fromDomain(application.event),
      canRateOrganizer: application.canRateOrganizer,
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

  @ApiProperty({
    description:
      'How many participants the signed-in main organizer may still rate (#235): the event is over and its rating period is on; 0 otherwise',
  })
  participantsToRate!: number;

  static fromHosted(event: MyHostedEvent): HostedEventResponseDto {
    return {
      ...EventListItemResponseDto.fromDomain(event),
      isHidden: event.isHidden,
      participantsToRate: event.participantsToRate,
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

  static fromDomain(page: MyHostedEventPage): MyHostedEventsResponseDto {
    return {
      items: page.items.map((event) =>
        HostedEventResponseDto.fromHosted(event),
      ),
      total: page.total,
    };
  }
}

// #231: an event on the "Zajímá mě" list. Nothing about who else saved it.
export class InterestedEventResponseDto extends EventListItemResponseDto {
  @ApiProperty({
    enum: INTERESTED_EVENT_STATES,
    description:
      'UPCOMING while the event is on; PAST once it is over; CANCELLED when called off',
  })
  state!: InterestedEventState;

  @ApiProperty({
    description:
      'The signed-in user watches the event for a free seat (#232); only they ever see it',
  })
  watchesFreeSpot!: boolean;

  @ApiProperty({
    description:
      'The user may start watching the event now: it is full, has not started, and nothing else keeps them from asking to join',
  })
  canWatchFreeSpot!: boolean;

  static fromInterested(event: MyInterestedEvent): InterestedEventResponseDto {
    return {
      ...EventListItemResponseDto.fromDomain(event),
      state: event.state,
      watchesFreeSpot: event.watchesFreeSpot,
      canWatchFreeSpot: event.canWatchFreeSpot,
    };
  }
}

export class MyInterestedEventsResponseDto {
  @ApiProperty({ type: [InterestedEventResponseDto] })
  items!: InterestedEventResponseDto[];

  @ApiProperty({
    description:
      'All saved events the user may still see that match the filter, not just this page',
  })
  total!: number;

  static fromDomain(
    page: MyInterestedEventPage,
  ): MyInterestedEventsResponseDto {
    return {
      items: page.items.map((event) =>
        InterestedEventResponseDto.fromInterested(event),
      ),
      total: page.total,
    };
  }
}
