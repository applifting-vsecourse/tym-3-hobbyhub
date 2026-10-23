import { GroupPage } from '@/modules/group/domain/group';
import { ApiProperty } from '@nestjs/swagger';
import { GroupResponseDto } from './group.response.dto';

export class GroupPageResponseDto {
  @ApiProperty({ type: [GroupResponseDto] })
  items!: GroupResponseDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Pass as `cursor` for the next page; null on the last page',
  })
  nextCursor!: string | null;

  static fromDomain(page: GroupPage): GroupPageResponseDto {
    return {
      items: page.items.map((group) => GroupResponseDto.fromDomain(group)),
      nextCursor: page.nextCursor,
    };
  }
}
