import {
  Decision,
  DECISIONS,
  EVENT_CHANGES,
  EventChange,
  Notification,
  NOTIFICATION_TYPES,
  NotificationPage,
  NotificationType,
} from '@/modules/notification/domain/notification';
import { ApiProperty } from '@nestjs/swagger';

class NotificationPersonDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Public name' })
  name!: string;
}

class NotificationEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;
}

class NotificationGroupDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

// The type and the data; the client writes the sentence (ADR-0015). The
// payload comes flattened, with every field present, so the client reads one
// shape for every type.
export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NOTIFICATION_TYPES })
  type!: NotificationType;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Null until the recipient has seen it',
  })
  readAt!: Date | null;

  @ApiProperty({
    type: NotificationPersonDto,
    nullable: true,
    description: 'Who caused it; null for a system notification',
  })
  actor!: NotificationPersonDto | null;

  @ApiProperty({ type: NotificationEventDto, nullable: true })
  event!: NotificationEventDto | null;

  @ApiProperty({ type: NotificationGroupDto, nullable: true })
  group!: NotificationGroupDto | null;

  @ApiProperty({
    enum: DECISIONS,
    nullable: true,
    description: 'REQUEST_DECIDED: how the request ended',
  })
  decision!: Decision | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'REQUEST_DECIDED: the organizer’s words, if any',
  })
  message!: string | null;

  @ApiProperty({
    enum: EVENT_CHANGES,
    isArray: true,
    description: 'EVENT_CHANGED: what moved; empty for the other types',
  })
  changes!: EventChange[];

  static fromDomain(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      actor: notification.actor,
      event: notification.event,
      group: notification.group,
      decision: notification.payload.decision ?? null,
      message: notification.payload.message ?? null,
      changes: notification.payload.changes ?? [],
    };
  }
}

export class NotificationPageResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];

  @ApiProperty({
    description: 'All the recipient’s notifications, not just this page',
  })
  total!: number;

  static fromDomain(page: NotificationPage): NotificationPageResponseDto {
    return {
      items: page.items.map(NotificationResponseDto.fromDomain),
      total: page.total,
    };
  }
}

export class NotificationCountResponseDto {
  @ApiProperty()
  count!: number;
}
