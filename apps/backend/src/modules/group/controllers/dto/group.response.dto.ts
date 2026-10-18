import { ActivityResponseDto } from '@/modules/activity/controllers/dto/activity.response.dto';
import { Group } from '@/modules/group/domain/group';
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
    };
  }
}
