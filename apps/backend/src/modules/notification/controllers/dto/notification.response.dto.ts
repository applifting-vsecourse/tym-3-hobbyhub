import {
  Decision,
  DECISIONS,
  EVENT_CHANGES,
  EVENT_REMINDERS,
  EventChange,
  EventReminderKind,
  FRIEND_REQUEST_STATUSES,
  FriendRequestStatus,
  Notification,
  NOTIFICATION_TYPES,
  NotificationPage,
  NotificationType,
} from '@/modules/notification/domain/notification';
import { ApiProperty } from '@nestjs/swagger';

class NotificationOccupancyDto {
  @ApiProperty({
    description: 'Seats taken, the ones outside the app included',
  })
  occupiedSpots!: number;

  @ApiProperty()
  maxParticipants!: number;

  @ApiProperty({
    description: 'How many are missing to the minimum; 0 once it is reached',
  })
  missingToMinimum!: number;
}

class NotificationReminderDto {
  @ApiProperty({
    enum: EVENT_REMINDERS,
    description: 'DAY: 24 h before, TWO_HOURS: 2 h before',
  })
  kind!: EventReminderKind;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'The start the reminder was for',
  })
  startsAt!: string;

  @ApiProperty({
    type: NotificationOccupancyDto,
    nullable: true,
    description:
      'HOSTED_EVENT_REMINDER: how full the event was when it went out',
  })
  occupancy!: NotificationOccupancyDto | null;
}

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

class NotificationFriendRequestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: FRIEND_REQUEST_STATUSES,
    description: 'Where the request stands now; the buttons only while PENDING',
  })
  status!: FriendRequestStatus;
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
    type: NotificationFriendRequestDto,
    nullable: true,
    description: 'FRIEND_REQUEST: the request it is about',
  })
  friendRequest!: NotificationFriendRequestDto | null;

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

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'EVENT_HIDDEN: why an administrator hid the event; only the organizers’ copy carries it (#239)',
  })
  reason!: string | null;

  @ApiProperty({
    type: NotificationReminderDto,
    nullable: true,
    description:
      'EVENT_REMINDER, HOSTED_EVENT_REMINDER: which reminder and for which start',
  })
  reminder!: NotificationReminderDto | null;

  static fromDomain(notification: Notification): NotificationResponseDto {
    const { reminder, startsAt, occupancy } = notification.payload;
    return {
      id: notification.id,
      type: notification.type,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      actor: notification.actor,
      event: notification.event,
      group: notification.group,
      friendRequest: notification.friendRequest,
      decision: notification.payload.decision ?? null,
      message: notification.payload.message ?? null,
      changes: notification.payload.changes ?? [],
      reason: notification.payload.reason ?? null,
      reminder:
        reminder && startsAt
          ? { kind: reminder, startsAt, occupancy: occupancy ?? null }
          : null,
    };
  }
}

export class NotificationPageResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];

  @ApiProperty({
    description:
      'All the recipient’s notifications the filter lets through, not just this page',
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
