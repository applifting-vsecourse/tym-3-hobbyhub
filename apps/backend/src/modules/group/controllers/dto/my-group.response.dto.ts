import { GroupRole, MyGroup } from '@/modules/group/domain/group';
import { ApiProperty } from '@nestjs/swagger';
import { GroupResponseDto } from './group.response.dto';

export class MyGroupResponseDto extends GroupResponseDto {
  @ApiProperty({ enum: ['OWNER', 'ADMIN', 'MEMBER'] })
  myRole!: GroupRole;

  static fromDomain(group: MyGroup): MyGroupResponseDto {
    return { ...GroupResponseDto.fromDomain(group), myRole: group.myRole };
  }
}
