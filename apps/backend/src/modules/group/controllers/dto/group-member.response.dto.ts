import {
  FRIEND_RELATIONS,
  FriendRelation,
} from '@/modules/friendship/domain/friendship';
import {
  GroupMember,
  GroupMemberListItem,
  GroupRole,
} from '@/modules/group/domain/group';
import { ApiProperty } from '@nestjs/swagger';

const GROUP_ROLES: GroupRole[] = ['OWNER', 'ADMIN', 'MEMBER'];

export class GroupMemberResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  image!: string | null;

  @ApiProperty({ enum: GROUP_ROLES })
  role!: GroupRole;

  @ApiProperty({ type: String, format: 'date-time' })
  joinedAt!: Date;

  static fromDomain(member: GroupMember): GroupMemberResponseDto {
    return {
      userId: member.userId,
      name: member.name,
      image: member.image,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }
}

// #225: a member in the list of members, with the viewer's friendship to them.
export class GroupMemberListItemResponseDto extends GroupMemberResponseDto {
  @ApiProperty({
    enum: FRIEND_RELATIONS,
    description:
      "The viewer's relation to the member: none (also for oneself), request_sent, request_received, friends",
  })
  relation!: FriendRelation;

  static fromListItem(
    member: GroupMemberListItem,
  ): GroupMemberListItemResponseDto {
    return {
      ...GroupMemberResponseDto.fromDomain(member),
      relation: member.relation,
    };
  }
}
