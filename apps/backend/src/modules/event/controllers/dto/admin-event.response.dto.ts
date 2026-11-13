import {
  AdminEventDetail,
  AdminEventListItem,
  AdminEventParticipant,
  AdminUserEvents,
  EventStatus,
  EventVisibility,
} from '@/modules/event/domain/event';
import { AdminPage } from '@/shared/admin-auth/domain/administration';
import { ApiProperty } from '@nestjs/swagger';
import { EventResponseDto } from './event.response.dto';

const EVENT_STATUSES: EventStatus[] = [
  'DRAFT',
  'PUBLISHED',
  'CANCELLED',
  'FINISHED',
  'NOT_HELD',
];
const EVENT_VISIBILITIES: EventVisibility[] = [
  'PUBLIC',
  'GROUP_ONLY',
  'PRIVATE',
];
const PARTICIPATION_STATUSES: AdminEventParticipant['status'][] = [
  'APPROVED',
  'WAITLISTED',
  'CANCELLED',
  'ATTENDED',
  'NO_SHOW',
  'INVITED',
  'DECLINED',
];

export class AdminRefResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AdminEventListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: EVENT_STATUSES })
  status!: EventStatus;

  @ApiProperty({ enum: EVENT_VISIBILITIES })
  visibility!: EventVisibility;

  @ApiProperty({ description: 'Hidden by an administrator' })
  isHidden!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  startAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty()
  activityName!: string;

  @ApiProperty({ type: AdminRefResponseDto })
  organizer!: AdminRefResponseDto;

  @ApiProperty({ type: AdminRefResponseDto, nullable: true })
  group!: AdminRefResponseDto | null;

  static fromDomain(item: AdminEventListItem): AdminEventListItemResponseDto {
    return {
      id: item.id,
      title: item.title,
      status: item.status,
      visibility: item.visibility,
      isHidden: item.isHidden,
      startAt: item.startAt,
      createdAt: item.createdAt,
      activityName: item.activityName,
      organizer: { id: item.organizer.id, name: item.organizer.name },
      group: item.group && { id: item.group.id, name: item.group.name },
    };
  }
}

export class AdminEventPageResponseDto {
  @ApiProperty({ type: [AdminEventListItemResponseDto] })
  items!: AdminEventListItemResponseDto[];

  @ApiProperty()
  total!: number;

  static fromDomain(
    page: AdminPage<AdminEventListItem>,
  ): AdminEventPageResponseDto {
    return {
      items: page.items.map((item) =>
        AdminEventListItemResponseDto.fromDomain(item),
      ),
      total: page.total,
    };
  }
}

export class AdminEventOrganizerResponseDto extends AdminRefResponseDto {
  @ApiProperty()
  email!: string;
}

export class AdminEventParticipantResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: PARTICIPATION_STATUSES })
  status!: AdminEventParticipant['status'];

  @ApiProperty({ type: Number, nullable: true })
  waitlistPosition!: number | null;
}

export class AdminEventDetailResponseDto {
  @ApiProperty({ type: EventResponseDto })
  event!: EventResponseDto;

  @ApiProperty({ description: 'Hidden by an administrator' })
  isHidden!: boolean;

  @ApiProperty({ type: AdminEventOrganizerResponseDto })
  organizer!: AdminEventOrganizerResponseDto;

  @ApiProperty({ type: AdminRefResponseDto, nullable: true })
  group!: AdminRefResponseDto | null;

  @ApiProperty({ type: [AdminEventParticipantResponseDto] })
  participants!: AdminEventParticipantResponseDto[];

  static fromDomain(detail: AdminEventDetail): AdminEventDetailResponseDto {
    return {
      event: EventResponseDto.fromDomain(detail.event),
      isHidden: detail.isHidden,
      organizer: {
        id: detail.organizer.id,
        name: detail.organizer.name,
        email: detail.organizer.email,
      },
      group: detail.group && { id: detail.group.id, name: detail.group.name },
      participants: detail.participants.map((participant) => ({
        userId: participant.userId,
        name: participant.name,
        status: participant.status,
        waitlistPosition: participant.waitlistPosition,
      })),
    };
  }
}

export class AdminUserParticipationResponseDto extends AdminEventListItemResponseDto {
  @ApiProperty({ enum: PARTICIPATION_STATUSES })
  participationStatus!: AdminEventParticipant['status'];
}

export class AdminUserEventsResponseDto {
  @ApiProperty({ type: [AdminEventListItemResponseDto] })
  organized!: AdminEventListItemResponseDto[];

  @ApiProperty({ type: [AdminUserParticipationResponseDto] })
  participations!: AdminUserParticipationResponseDto[];

  static fromDomain(events: AdminUserEvents): AdminUserEventsResponseDto {
    return {
      organized: events.organized.map((item) =>
        AdminEventListItemResponseDto.fromDomain(item),
      ),
      participations: events.participations.map((item) => ({
        ...AdminEventListItemResponseDto.fromDomain(item),
        participationStatus: item.participationStatus,
      })),
    };
  }
}
