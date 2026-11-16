import {
  AdminUserDetail,
  AdminUserListItem,
} from '@/modules/profile/domain/profile';
import { AdminPage } from '@/shared/admin-auth/domain/administration';
import { ApiProperty } from '@nestjs/swagger';
import { ProfileResponseDto } from './profile.response.dto';

const USER_STATUSES: AdminUserListItem['status'][] = [
  'ACTIVE',
  'RESTRICTED',
  'BLOCKED',
  'DELETED',
];

export class AdminUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ enum: USER_STATUSES })
  status!: AdminUserListItem['status'];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static fromDomain(user: AdminUserListItem): AdminUserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}

export class AdminUserPageResponseDto {
  @ApiProperty({ type: [AdminUserResponseDto] })
  items!: AdminUserResponseDto[];

  @ApiProperty()
  total!: number;

  static fromDomain(
    page: AdminPage<AdminUserListItem>,
  ): AdminUserPageResponseDto {
    return {
      items: page.items.map((user) => AdminUserResponseDto.fromDomain(user)),
      total: page.total,
    };
  }
}

export class AdminUserDetailResponseDto {
  @ApiProperty({ type: AdminUserResponseDto })
  account!: AdminUserResponseDto;

  @ApiProperty({ type: ProfileResponseDto })
  profile!: ProfileResponseDto;

  static fromDomain(detail: AdminUserDetail): AdminUserDetailResponseDto {
    return {
      account: AdminUserResponseDto.fromDomain(detail.account),
      profile: ProfileResponseDto.fromDomain(detail.profile),
    };
  }
}
