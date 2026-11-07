import type { GroupEventsPeriod } from '@/modules/event/domain/event';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

const PERIODS: GroupEventsPeriod[] = ['upcoming', 'past'];

// F-07.2: which events of the group, and from where. The page size is fixed
// (`GROUP_EVENTS_PAGE_SIZE`).
export class GroupEventsQuery {
  @ApiPropertyOptional({ enum: PERIODS, default: 'upcoming' })
  @IsOptional()
  @IsIn(PERIODS)
  period: GroupEventsPeriod = 'upcoming';

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
