import { CharLength } from '@/core/validation/char-length.decorator';
import { EVENT_CANCELLATION_NOTE_MAX_LENGTH } from '@/modules/event/domain/event';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelEventDto {
  @ApiProperty({ description: 'Id from GET /api/cancellation-reasons' })
  @IsString()
  @IsNotEmpty()
  cancellationReasonId!: string;

  @ApiPropertyOptional({
    example: 'Hala je kvůli opravě zavřená.',
    maxLength: EVENT_CANCELLATION_NOTE_MAX_LENGTH,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsOptional()
  @IsString()
  @CharLength(0, EVENT_CANCELLATION_NOTE_MAX_LENGTH)
  cancellationNote?: string;
}
