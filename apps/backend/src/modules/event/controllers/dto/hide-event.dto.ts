import { CharLength } from '@/core/validation/char-length.decorator';
import {
  EVENT_HIDDEN_REASON_MAX_LENGTH,
  EVENT_HIDDEN_REASON_MIN_LENGTH,
} from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

// #239, ADR-0022: why the administrator hides the event. The organizers read
// it; the other people only learn that the event is gone.
export class HideEventDto {
  @ApiProperty({
    example: 'Akce porušuje podmínky použití: nabízí placené služby.',
    minLength: EVENT_HIDDEN_REASON_MIN_LENGTH,
    maxLength: EVENT_HIDDEN_REASON_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @CharLength(EVENT_HIDDEN_REASON_MIN_LENGTH, EVENT_HIDDEN_REASON_MAX_LENGTH)
  reason!: string;
}
