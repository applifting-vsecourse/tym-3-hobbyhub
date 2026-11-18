import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import { Group, GroupRole } from '@/modules/group/domain/group';
import { ApiProperty } from '@nestjs/swagger';

export class GroupResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, nullable: true })
  locationName!: string | null;

  @ApiProperty({ type: String, nullable: true })
  usualSchedule!: string | null;

  @ApiProperty({ enum: ['PUBLIC', 'PRIVATE'] })
  visibility!: Group['visibility'];

  @ApiProperty({ enum: ['ACTIVE', 'CANCELLED'] })
  status!: Group['status'];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: ActivityResponseDto })
  activity!: ActivityResponseDto;

  @ApiProperty()
  memberCount!: number;

  @ApiProperty({
    description: 'Has a public event upcoming or ended in the last 60 days',
  })
  isActive!: boolean;

  @ApiProperty({
    enum: ['OPEN', 'APPROVAL'],
    description: 'OPEN: anyone joins at once; APPROVAL: the admins decide',
  })
  approvalMode!: Group['approvalMode'];

  @ApiProperty({
    type: [Number],
    description: 'ISO weekdays the group meets on, 1 = Monday .. 7 = Sunday',
  })
  meetingDays!: number[];

  @ApiProperty({ type: Number, nullable: true })
  latitude!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  longitude!: number | null;

  @ApiProperty({
    nullable: true,
    description: 'The next public event: id, title, start and a free seat',
    example: {
      id: 'e1',
      title: 'Florbal',
      startAt: '2030-01-01T18:00:00.000Z',
      hasFreeSeats: true,
    },
  })
  nextEvent!: {
    id: string;
    title: string;
    startAt: Date;
    hasFreeSeats: boolean;
  } | null;

  static fromDomain(group: Group): GroupResponseDto {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      locationName: group.locationName,
      usualSchedule: group.usualSchedule,
      visibility: group.visibility,
      status: group.status,
      createdAt: group.createdAt,
      activity: ActivityResponseDto.fromDomain(group.activity),
      memberCount: group.memberCount,
      isActive: group.isActive,
      approvalMode: group.approvalMode,
      meetingDays: group.meetingDays,
      latitude: group.latitude,
      longitude: group.longitude,
      nextEvent: group.nextEvent,
    };
  }
}

export class GroupMembershipResponseDto {
  @ApiProperty()
  isMember!: boolean;

  @ApiProperty({ enum: ['OWNER', 'ADMIN', 'MEMBER'], nullable: true })
  role!: GroupRole | null;
}

export class GroupStatsResponseDto {
  @ApiProperty({ description: 'Public events of the group that have ended' })
  playedEvents!: number;

  @ApiProperty({ description: 'People per such event, on average' })
  averageParticipants!: number;
}
