import { AdministratorsService } from '@/modules/administrator/services/administrators.service';
import { Admin } from '@/shared/admin-auth/decorators/admin.decorator';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdministratorResponseDto } from './dto/administrator.response.dto';

// #238: who runs the platform, read only. New administrators come from
// `admin:create`, not from here.
@ApiTags('admin')
@Controller('admin/administrators')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
export class AdministratorsController {
  constructor(private readonly service: AdministratorsService) {}

  @Get()
  @ApiOperation({ summary: 'List the administrators, oldest first' })
  @ApiResponse({ status: 200, type: [AdministratorResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  async list(): Promise<AdministratorResponseDto[]> {
    const administrators = await this.service.listAdministrators();
    return administrators.map((administrator) =>
      AdministratorResponseDto.fromDomain(administrator),
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'The signed-in administrator' })
  @ApiResponse({ status: 200, type: AdministratorResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  me(
    @Admin() admin: AdminIdentity,
  ): Pick<AdministratorResponseDto, 'id' | 'name' | 'email'> {
    return { id: admin.id, name: admin.name, email: admin.email };
  }
}
