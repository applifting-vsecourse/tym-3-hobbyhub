import {
  CreateEventDto,
  CreateEventLocationDto,
} from '@/modules/event/controllers/dto/create-event.dto';
import { VenueType } from '@/modules/event/domain/event';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmptyObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

const VENUE_TYPES = ['PUBLIC_VENUE', 'PRIVATE_VENUE', 'ONLINE'] as const;

// An edit sends the whole form again, so it is checked like a new event. An
// online event (which cannot be created yet) can be edited, and has no address.
export class UpdateEventDto extends OmitType(CreateEventDto, [
  'venueType',
  'location',
] as const) {
  @ApiProperty({
    enum: VENUE_TYPES,
    description: 'The kind of the event cannot switch between online and place',
  })
  @IsIn(VENUE_TYPES)
  venueType!: VenueType;

  @ApiPropertyOptional({
    type: CreateEventLocationDto,
    description: 'Required unless the event is online',
  })
  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => CreateEventLocationDto)
  location?: CreateEventLocationDto;
}
