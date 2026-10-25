import { CharLength } from '@/core/validation/char-length.decorator';
import { MEMBERSHIP_REQUEST_MESSAGE_MAX_LENGTH } from '@/modules/membership-request/domain/membership-request';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

// Optional text: whitespace only counts as not filled in.
const trimToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CreateMembershipRequestDto {
  @ApiPropertyOptional({
    description: "Message to the group's admins",
    example: 'Hraju třetí rok za firemní tým a hledám pravidelnou skupinu.',
    maxLength: MEMBERSHIP_REQUEST_MESSAGE_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, MEMBERSHIP_REQUEST_MESSAGE_MAX_LENGTH)
  message?: string;
}
