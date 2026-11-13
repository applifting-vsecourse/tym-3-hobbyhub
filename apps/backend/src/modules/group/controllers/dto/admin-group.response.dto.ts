import { AdminGroupDetail, Group } from '@/modules/group/domain/group';
import { AdminPage } from '@/shared/admin-auth/domain/administration';
import { ApiProperty } from '@nestjs/swagger';
import { GroupMemberResponseDto } from './group-member.response.dto';
import { GroupResponseDto } from './group.response.dto';

export class AdminGroupPageResponseDto {
  @ApiProperty({ type: [GroupResponseDto] })
  items!: GroupResponseDto[];

  @ApiProperty()
  total!: number;

  static fromDomain(page: AdminPage<Group>): AdminGroupPageResponseDto {
    return {
      items: page.items.map((group) => GroupResponseDto.fromDomain(group)),
      total: page.total,
    };
  }
}

export class AdminGroupDetailResponseDto {
  @ApiProperty({ type: GroupResponseDto })
  group!: GroupResponseDto;

  @ApiProperty({ type: [GroupMemberResponseDto] })
  members!: GroupMemberResponseDto[];

  static fromDomain(detail: AdminGroupDetail): AdminGroupDetailResponseDto {
    return {
      group: GroupResponseDto.fromDomain(detail.group),
      members: detail.members.map((member) =>
        GroupMemberResponseDto.fromDomain(member),
      ),
    };
  }
}
