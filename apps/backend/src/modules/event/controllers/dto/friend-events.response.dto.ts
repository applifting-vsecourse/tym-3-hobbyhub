import {
  EventFriend,
  FriendsEventItem,
  FriendsEventPage,
  PersonEventPage,
} from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { EventListItemResponseDto } from './event-list-item.response.dto';

// #226: a friend on an event, with only what their public profile shows.
export class EventFriendResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'The nickname, the one public name (ADR-0025)' })
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'WebP data URL of the photo',
  })
  image!: string | null;

  static fromDomain(friend: EventFriend): EventFriendResponseDto {
    return { id: friend.id, name: friend.name, image: friend.image };
  }
}

// #226: a page of one person's events, as a friend sees them on the profile.
export class PersonEventPageResponseDto {
  @ApiProperty({ type: [EventListItemResponseDto] })
  items!: EventListItemResponseDto[];

  @ApiProperty({
    description: 'All the events of the period, not just this page',
  })
  total!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Offset of the next page; null on the last one',
  })
  nextOffset!: number | null;

  static fromDomain(page: PersonEventPage): PersonEventPageResponseDto {
    return {
      items: page.items.map((item) =>
        EventListItemResponseDto.fromDomain(item),
      ),
      total: page.total,
      nextOffset: page.nextOffset,
    };
  }
}

// #226: an upcoming event my friends go to or organize, with which of them.
export class FriendsEventItemResponseDto {
  @ApiProperty({ type: EventListItemResponseDto })
  event!: EventListItemResponseDto;

  @ApiProperty({
    type: [EventFriendResponseDto],
    description:
      'Only friends who let friends see their upcoming events, by name',
  })
  friends!: EventFriendResponseDto[];

  static fromDomain(item: FriendsEventItem): FriendsEventItemResponseDto {
    return {
      event: EventListItemResponseDto.fromDomain(item.event),
      friends: item.friends.map((friend) =>
        EventFriendResponseDto.fromDomain(friend),
      ),
    };
  }
}

export class FriendsEventPageResponseDto {
  @ApiProperty({ type: [FriendsEventItemResponseDto] })
  items!: FriendsEventItemResponseDto[];

  @ApiProperty({ description: 'All such events, not just this page' })
  total!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Offset of the next page; null on the last one',
  })
  nextOffset!: number | null;

  static fromDomain(page: FriendsEventPage): FriendsEventPageResponseDto {
    return {
      items: page.items.map((item) =>
        FriendsEventItemResponseDto.fromDomain(item),
      ),
      total: page.total,
      nextOffset: page.nextOffset,
    };
  }
}
