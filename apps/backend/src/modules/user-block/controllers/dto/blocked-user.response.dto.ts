import { BlockedUser } from '@/modules/user-block/domain/user-block';
import { ApiProperty } from '@nestjs/swagger';

// #65: someone the signed-in user blocked, for their own settings only
// (visibility matrix: "Koho zablokoval", Sám).
export class BlockedUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'The public nickname' })
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'WebP data URL of the photo',
  })
  image!: string | null;

  @ApiProperty()
  blockedAt!: Date;

  static fromDomain(user: BlockedUser): BlockedUserResponseDto {
    return {
      id: user.id,
      name: user.name,
      image: user.image,
      blockedAt: user.blockedAt,
    };
  }
}
