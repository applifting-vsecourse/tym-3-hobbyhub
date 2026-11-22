import { blankToUndefined } from '@/modules/event/controllers/dto/event-filter.query';
import { LANDING_CITY_MAX_LENGTH } from '@/modules/landing/domain/landing';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LandingQuery {
  @ApiPropertyOptional({
    maxLength: LANDING_CITY_MAX_LENGTH,
    example: 'Brno',
    description:
      'The city picked for "Ve tvém okolí" when it goes by city; otherwise the home city or the one with the most events',
  })
  @Transform(blankToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(LANDING_CITY_MAX_LENGTH)
  city?: string;
}
