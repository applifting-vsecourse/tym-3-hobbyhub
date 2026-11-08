import {
  NOTIFICATION_KINDS,
  NOTIFICATION_LIST_DEFAULT_LIMIT,
  NOTIFICATION_LIST_MAX_LIMIT,
  NotificationKind,
} from '@/modules/notification/domain/notification';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

// A query parameter arrives as a string; only the two words count as a
// boolean, anything else stays as it came and fails `IsBoolean`.
const toBoolean = ({ value }: { value: unknown }): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ListNotificationsQuery {
  @ApiPropertyOptional({
    default: NOTIFICATION_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: NOTIFICATION_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(NOTIFICATION_LIST_MAX_LIMIT)
  limit: number = NOTIFICATION_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'true: only the read ones, false: only the unread ones; both without it',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional({
    enum: NOTIFICATION_KINDS,
    description:
      'Only this kind: requests (NEW_REQUESTS, REQUEST_DECIDED, PARTICIPANT_CANCELLED, CONFIRMATION_PROMPT, SPOT_AVAILABLE), events (EVENT_CHANGED, EVENT_CANCELLED, EVENT_BOARD), groups (GROUP_INVITATION), other (ONBOARDING_SERIES, MONTHLY_RECOMMENDATION); every kind without it',
  })
  @IsOptional()
  @IsIn(NOTIFICATION_KINDS)
  kind?: NotificationKind;
}
