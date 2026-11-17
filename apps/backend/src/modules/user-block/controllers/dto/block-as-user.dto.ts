import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// #65, ADR-0028: who the signed-in user blocks. The blocker is the session,
// never part of the body.
export class BlockAsUserDto {
  @ApiProperty({ description: 'The person to block' })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
