import { CharLength } from '@/core/validation/char-length.decorator';
import {
  USER_BLOCK_REASON_MAX_LENGTH,
  USER_BLOCK_REASON_MIN_LENGTH,
} from '@/modules/user-block/domain/user-block';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

// #239, ADR-0022: who the person is blocked from, and why. Only the
// administration ever reads the reason.
export class BlockUserDto {
  @ApiProperty({ description: 'The other person of the pair' })
  @IsString()
  @IsNotEmpty()
  otherUserId!: string;

  @ApiProperty({
    example: 'Opakované obtěžování po akci, nahlášeno oběma stranami.',
    minLength: USER_BLOCK_REASON_MIN_LENGTH,
    maxLength: USER_BLOCK_REASON_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @CharLength(USER_BLOCK_REASON_MIN_LENGTH, USER_BLOCK_REASON_MAX_LENGTH)
  reason!: string;
}
