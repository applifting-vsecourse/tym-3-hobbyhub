import { EVENT_PARTICIPANTS_LIMIT } from '@/modules/event/domain/event';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

// F-05.6: the seats of people outside the app, changed on their own.
export class UpdateExternalSpotsDto {
  @ApiProperty({
    example: 3,
    minimum: 0,
    maximum: EVENT_PARTICIPANTS_LIMIT,
    description:
      'Seats taken by people outside the app; with the approved participants at most maxParticipants',
  })
  @IsInt()
  @Min(0)
  @Max(EVENT_PARTICIPANTS_LIMIT)
  externalOccupiedSpots!: number;
}
