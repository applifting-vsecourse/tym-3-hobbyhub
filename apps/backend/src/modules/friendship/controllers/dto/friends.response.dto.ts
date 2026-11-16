import {
  FRIEND_RELATIONS,
  FriendRelation,
  FriendSearchPage,
  FriendSearchResult,
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
