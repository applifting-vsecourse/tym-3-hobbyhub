import {
  FRIEND_RELATIONS,
  FriendRelation,
  FriendSearchPage,
  FriendSearchResult,
  ReceivedFriendRequest,
  ReceivedFriendRequestPage,
} from '@/modules/friendship/domain/friendship';
import { ApiProperty } from '@nestjs/swagger';

// #225: one person found. Only the public profile (visibility matrix):
// never the e-mail.
export class FriendSearchItemResponseDto {
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

  @ApiProperty({ enum: FRIEND_RELATIONS })
  relation!: FriendRelation;

  static fromDomain(result: FriendSearchResult): FriendSearchItemResponseDto {
    return {
      id: result.id,
      name: result.name,
      image: result.image,
      relation: result.relation,
    };
  }
}

export class FriendSearchPageResponseDto {
  @ApiProperty({ type: [FriendSearchItemResponseDto] })
  items!: FriendSearchItemResponseDto[];

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Offset of the next page; null on the last one',
  })
  nextOffset!: number | null;

  static fromDomain(page: FriendSearchPage): FriendSearchPageResponseDto {
    return {
      items: page.items.map((item) =>
        FriendSearchItemResponseDto.fromDomain(item),
      ),
      nextOffset: page.nextOffset,
    };
  }
}

export class FriendRelationResponseDto {
  @ApiProperty({ enum: FRIEND_RELATIONS })
  relation!: FriendRelation;
}

// #228: who asks me, with only what their public profile shows.
export class FriendRequestSenderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'The public name' })
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The username, when the person has one',
  })
  nickname!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'WebP data URL of the photo',
  })
  image!: string | null;
}

export class ReceivedFriendRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  requestedAt!: Date;

  @ApiProperty({ type: FriendRequestSenderResponseDto })
  sender!: FriendRequestSenderResponseDto;

  static fromDomain(
    request: ReceivedFriendRequest,
  ): ReceivedFriendRequestResponseDto {
    return {
      id: request.id,
      requestedAt: request.requestedAt,
      sender: {
        id: request.sender.id,
        name: request.sender.name,
        nickname: request.sender.nickname,
        image: request.sender.image,
      },
    };
  }
}

export class ReceivedFriendRequestPageResponseDto {
  @ApiProperty({ type: [ReceivedFriendRequestResponseDto] })
  items!: ReceivedFriendRequestResponseDto[];

  @ApiProperty({
    description: 'All the requests waiting for me, not just this page',
  })
  total!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Offset of the next page; null on the last one',
  })
  nextOffset!: number | null;

  static fromDomain(
    page: ReceivedFriendRequestPage,
  ): ReceivedFriendRequestPageResponseDto {
    return {
      items: page.items.map((item) =>
        ReceivedFriendRequestResponseDto.fromDomain(item),
      ),
      total: page.total,
      nextOffset: page.nextOffset,
    };
  }
}
