import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// #225: whom to ask. The sender is the signed-in user, never the body.
export class SendFriendRequestDto {
  @ApiProperty({ description: 'The person asked to become a friend' })
  @IsString()
  @IsNotEmpty()
  recipientId!: string;
}
