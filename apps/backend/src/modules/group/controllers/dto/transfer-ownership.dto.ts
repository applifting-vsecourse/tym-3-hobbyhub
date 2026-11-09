import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// F-07.3b: the member who becomes the group's owner.
export class TransferOwnershipDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
