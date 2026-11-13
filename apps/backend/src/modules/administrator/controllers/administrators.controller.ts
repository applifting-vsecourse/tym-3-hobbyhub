import { AdministratorsService } from '@/modules/administrator/services/administrators.service';
import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { Admin } from '@/shared/admin-auth/decorators/admin.decorator';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdministratorResponseDto } from './dto/administrator.response.dto';
import { InviteAdministratorDto } from './dto/invite-administrator.dto';

// #238, #237: who runs the platform. Administrators invite, deactivate and
// reactivate each other (ADR-0021); the first one comes from `admin:create`.
@ApiTags('admin')
@Controller('admin/administrators')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
@UsePipes(adminValidationPipe)
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a new administrator by e-mail' })
  @ApiResponse({ status: 201, type: AdministratorResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid e-mail or name' })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({
    status: 409,
    description:
      'An administrator already (ALREADY_ADMINISTRATOR), or a deactivated one (DEACTIVATED_ADMINISTRATOR)',
  })
  async invite(
    @Admin() admin: AdminIdentity,
    @Body() body: InviteAdministratorDto,
  ): Promise<AdministratorResponseDto> {
    const administrator = await this.service.invite(admin, body);
    return AdministratorResponseDto.fromDomain(administrator);
  }

  @Post(':id/invitation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send the invitation again; the previous link stops working',
  })
  @ApiResponse({ status: 200, type: AdministratorResponseDto })
  @ApiResponse({ status: 400, description: 'Not invited (NOT_INVITED)' })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such administrator' })
  async resendInvitation(
    @Param('id') id: string,
  ): Promise<AdministratorResponseDto> {
    const administrator = await this.service.resendInvitation(id);
    return AdministratorResponseDto.fromDomain(administrator);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Take the access away and end every session of the administrator',
  })
  @ApiResponse({ status: 200, type: AdministratorResponseDto })
  @ApiResponse({
    status: 400,
    description: 'SELF, ALREADY_DEACTIVATED or LAST_ACTIVE',
  })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such administrator' })
  async deactivate(
    @Admin() admin: AdminIdentity,
    @Param('id') id: string,
  ): Promise<AdministratorResponseDto> {
    const administrator = await this.service.deactivate(admin, id);
    return AdministratorResponseDto.fromDomain(administrator);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Give the access back: the old password is gone, a new invitation goes out',
  })
  @ApiResponse({ status: 200, type: AdministratorResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Not deactivated (NOT_DEACTIVATED)',
  })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such administrator' })
  async reactivate(@Param('id') id: string): Promise<AdministratorResponseDto> {
    const administrator = await this.service.reactivate(id);
    return AdministratorResponseDto.fromDomain(administrator);
  }
}
