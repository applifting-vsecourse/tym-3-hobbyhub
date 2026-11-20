import {
  AdminUserBlock,
  USER_BLOCK_SOURCES,
  UserBlockSource,
} from '@/modules/user-block/domain/user-block';
import { ApiProperty } from '@nestjs/swagger';

class AdminUserBlockRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

// #239: a block of a person, for the administration only (visibility
// matrix: Superadmin). Neither person of the pair ever gets it. #65: a block a
// user made is listed too; it has no reason and runs one way.
export class AdminUserBlockResponseDto {
  @ApiProperty({ enum: USER_BLOCK_SOURCES })
  source!: UserBlockSource;

  @ApiProperty({ type: AdminUserBlockRefDto })
  otherUser!: AdminUserBlockRefDto;

  @ApiProperty({
    description:
      "A user's block: true when this person blocked the other one, false when the other one blocked them. Always false for an administrator's block, which runs both ways",
  })
  isBlocker!: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Set on an administrator's block only",
  })
  reason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: AdminUserBlockRefDto, nullable: true })
  createdBy!: AdminUserBlockRefDto | null;

  static fromDomain(block: AdminUserBlock): AdminUserBlockResponseDto {
    return {
      source: block.source,
      otherUser: { id: block.otherUser.id, name: block.otherUser.name },
      isBlocker: block.isBlocker,
      reason: block.reason,
      createdAt: block.createdAt,
      createdBy: block.createdBy && {
        id: block.createdBy.id,
        name: block.createdBy.name,
      },
    };
  }
}
