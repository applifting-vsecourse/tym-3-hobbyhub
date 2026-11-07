import {
  GroupEventListItem,
  GroupEventPage,
} from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { EventListItemResponseDto } from './event-list-item.response.dto';

// F-07.2: a card of a group's event on the group page.
export class GroupEventListItemResponseDto extends EventListItemResponseDto {
  @ApiProperty({
    enum: ['PUBLISHED', 'CANCELLED', 'FINISHED', 'NOT_HELD'],
    description: 'Cancelled events stay in the list',
  })
  status!: GroupEventListItem['status'];

  @ApiProperty({
    enum: ['PUBLIC', 'GROUP_ONLY'],
    description: 'GROUP_ONLY only ever reaches the members of the group',
  })
  visibility!: GroupEventListItem['visibility'];

  static fromGroupEvent(
    event: GroupEventListItem,
  ): GroupEventListItemResponseDto {
    return {
      ...EventListItemResponseDto.fromDomain(event),
      status: event.status,
      visibility: event.visibility,
    };
  }
}

export class GroupEventListResponseDto {
  @ApiProperty({ type: [GroupEventListItemResponseDto] })
  items!: GroupEventListItemResponseDto[];

  @ApiProperty({
    description: 'All the events of this period, not just the page',
  })
  total!: number;

  static fromDomain(page: GroupEventPage): GroupEventListResponseDto {
    return {
      items: page.items.map((event) =>
        GroupEventListItemResponseDto.fromGroupEvent(event),
      ),
      total: page.total,
    };
  }
}
