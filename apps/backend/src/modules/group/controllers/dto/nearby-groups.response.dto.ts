import { NearbyGroups } from '@/modules/group/domain/group';
import { ApiProperty } from '@nestjs/swagger';
import { GroupResponseDto } from './group.response.dto';

export class NearbyGroupsResponseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'City the search used; null when the user has not set one',
  })
  city!: string | null;

  @ApiProperty({ type: [GroupResponseDto] })
  groups!: GroupResponseDto[];

  static fromDomain(nearby: NearbyGroups): NearbyGroupsResponseDto {
    return {
      city: nearby.city,
      groups: nearby.groups.map((group) => GroupResponseDto.fromDomain(group)),
    };
  }
}
