import type { EventPeriod } from '@/modules/event/domain/event';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const PERIODS: EventPeriod[] = ['upcoming', 'past'];

// #226: whose events and which of them, on a friend's profile.
export class FriendEventsParams {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ enum: PERIODS })
  @IsIn(PERIODS)
  period!: EventPeriod;
}

// Where the page starts. The page size is fixed (`FRIEND_EVENTS_PAGE_SIZE`).
export class FriendEventsPageQuery {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
