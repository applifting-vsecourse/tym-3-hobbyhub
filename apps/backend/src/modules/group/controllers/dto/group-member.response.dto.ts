import { GroupMember, GroupRole } from '@/modules/group/domain/group';
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
