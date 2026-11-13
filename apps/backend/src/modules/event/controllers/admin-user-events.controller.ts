import { EventsService } from '@/modules/event/services/events.service';
import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import { Controller, Get, Param, UseGuards, UsePipes } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminUserEventsResponseDto } from './dto/admin-event.response.dto';

// #238: a person's events in the administration's user detail (visibility
// matrix: Superadmin sees the history of participation and organizing). Here
// rather than in the profile module, which does not know about events.
@ApiTags('admin')
@Controller('admin/users/:userId/events')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
@UsePipes(adminValidationPipe)
export class AdminUserEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary: 'Events a person organizes and holds a seat on, newest first',
  })
  @ApiResponse({ status: 200, type: AdminUserEventsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  async list(
    @Param('userId') userId: string,
  ): Promise<AdminUserEventsResponseDto> {
    const events =
      await this.eventsService.getUserEventsForAdministration(userId);
    return AdminUserEventsResponseDto.fromDomain(events);
  }
}
