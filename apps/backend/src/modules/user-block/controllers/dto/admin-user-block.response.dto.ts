import { AdminUserBlock } from '@/modules/user-block/domain/user-block';
import { ApiProperty } from '@nestjs/swagger';

class AdminUserBlockRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

// #239: a block of a person, for the administration only (visibility
// matrix: Superadmin). Neither person of the pair ever gets it.
export class AdminUserBlockResponseDto {
  @ApiProperty({ type: AdminUserBlockRefDto })
  otherUser!: AdminUserBlockRefDto;

  @ApiProperty()
  reason!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: AdminUserBlockRefDto, nullable: true })
  createdBy!: AdminUserBlockRefDto | null;

  static fromDomain(block: AdminUserBlock): AdminUserBlockResponseDto {
    return {
      otherUser: { id: block.otherUser.id, name: block.otherUser.name },
      reason: block.reason,
      createdAt: block.createdAt,
      createdBy: block.createdBy && {
        id: block.createdBy.id,
        name: block.createdBy.name,
      },
    };
  }
}
