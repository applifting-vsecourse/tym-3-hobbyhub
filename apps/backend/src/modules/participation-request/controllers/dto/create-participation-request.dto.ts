import { CharLength } from '@/core/validation/char-length.decorator';
import { PARTICIPATION_REQUEST_MESSAGE_MAX_LENGTH } from '@/modules/participation-request/domain/participation-request';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

// Optional text: whitespace only counts as not filled in.
const trimToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CreateParticipationRequestDto {
  @ApiPropertyOptional({
    description: 'Message to the organizer',
    example: 'Hraju třetím rokem, beru si vlastní hokejku.',
    maxLength: PARTICIPATION_REQUEST_MESSAGE_MAX_LENGTH,
  })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @CharLength(0, PARTICIPATION_REQUEST_MESSAGE_MAX_LENGTH)
  message?: string;
}
