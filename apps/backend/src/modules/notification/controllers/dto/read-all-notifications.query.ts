import {
  NOTIFICATION_KINDS,
  NotificationKind,
} from '@/modules/notification/domain/notification';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

// #175: the page marks read only the kind its filter shows.
export class ReadAllNotificationsQuery {
  @ApiPropertyOptional({
    enum: NOTIFICATION_KINDS,
    description:
      'Only the unread ones of this kind (the same kinds as the list); every kind without it',
  })
  @IsOptional()
  @IsIn(NOTIFICATION_KINDS)
  kind?: NotificationKind;
}
