import {
  MY_MEMBERSHIP_REQUEST_SECTIONS,
  MyMembershipRequestSection,
} from '@/modules/membership-request/domain/membership-request';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class MyMembershipRequestsQueryDto {
  @ApiProperty({
    enum: MY_MEMBERSHIP_REQUEST_SECTIONS,
    description:
      '`pending`: still to be decided; `history`: rejected, withdrawn, or on a cancelled group',
  })
  @IsIn(MY_MEMBERSHIP_REQUEST_SECTIONS)
  section!: MyMembershipRequestSection;

  @ApiPropertyOptional({ description: '`nextCursor` from the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  cursor?: string;
}
