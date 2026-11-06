import {
  ASSIGNABLE_GROUP_ROLES,
  type AssignableGroupRole,
} from '@/modules/group/domain/group';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

// F-07.3b: the owner names (ADMIN) or demotes (MEMBER) an admin. OWNER is
// handed over by POST /groups/:id/ownership, never set here.
export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_GROUP_ROLES })
  @IsIn(ASSIGNABLE_GROUP_ROLES)
  role!: AssignableGroupRole;
}
