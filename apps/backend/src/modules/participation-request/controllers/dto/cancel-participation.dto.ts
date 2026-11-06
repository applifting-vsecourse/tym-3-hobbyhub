import { CharLength } from '@/core/validation/char-length.decorator';
import {
  PARTICIPATION_CANCELLATION_MESSAGE_MAX_LENGTH,
  PARTICIPATION_CANCELLATION_MESSAGE_MIN_LENGTH,
} from '@/modules/participation-request/domain/participation-request';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// F-06.4, ADR-0016: the message is required, its edges' whitespace does not
// count towards the minimum.
export class CancelParticipationDto {
  @ApiProperty({
    description: 'Why the participant cancels, for the organizers',
    example: 'Onemocněl jsem, promiňte. Snad příště.',
    minLength: PARTICIPATION_CANCELLATION_MESSAGE_MIN_LENGTH,
    maxLength: PARTICIPATION_CANCELLATION_MESSAGE_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString()
  @CharLength(
    PARTICIPATION_CANCELLATION_MESSAGE_MIN_LENGTH,
    PARTICIPATION_CANCELLATION_MESSAGE_MAX_LENGTH,
  )
  message!: string;
}
