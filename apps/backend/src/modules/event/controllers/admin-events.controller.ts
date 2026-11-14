import { EventsService } from '@/modules/event/services/events.service';
import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { Admin } from '@/shared/admin-auth/decorators/admin.decorator';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { AdminListQuery } from '@/shared/admin-auth/dto/admin-list.query';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdminEventDetailResponseDto,
  AdminEventPageResponseDto,
} from './dto/admin-event.response.dto';
import { HideEventDto } from './dto/hide-event.dto';

// #238: events in the administration. Every event, hidden and drafts too
// (visibility matrix: Superadmin). #239: an administrator hides one and
// brings it back (ADR-0022).
@ApiTags('admin')
@Controller('admin/events')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
@UsePipes(adminValidationPipe)
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List every event, newest first' })
  @ApiResponse({ status: 200, type: AdminEventPageResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  async list(
    @Query() query: AdminListQuery,
  ): Promise<AdminEventPageResponseDto> {
    const page = await this.eventsService.listEventsForAdministration({
      search: query.q,
      offset: query.offset,
    });
    return AdminEventPageResponseDto.fromDomain(page);
  }

  @Get(':id')
  @ApiOperation({ summary: 'An event with its organizer and participants' })
  @ApiResponse({ status: 200, type: AdminEventDetailResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such event' })
  async detail(@Param('id') id: string): Promise<AdminEventDetailResponseDto> {
    const detail = await this.eventsService.getEventForAdministration(id);
    return AdminEventDetailResponseDto.fromDomain(detail);
  }

  @Post(':id/hide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Hide an event from everyone but its organizers, with a reason (#239)',
  })
  @ApiResponse({ status: 200, type: AdminEventDetailResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid reason, a draft, or already hidden',
  })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such event' })
  async hide(
    @Admin() admin: AdminIdentity,
    @Param('id') id: string,
    @Body() body: HideEventDto,
  ): Promise<AdminEventDetailResponseDto> {
    const detail = await this.eventsService.moderateEvent(admin, id, {
      kind: 'HIDE',
      reason: body.reason,
    });
    return AdminEventDetailResponseDto.fromDomain(detail);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bring back an event an administrator hid (#239)' })
  @ApiResponse({ status: 200, type: AdminEventDetailResponseDto })
  @ApiResponse({ status: 400, description: 'The event is not hidden' })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such event' })
  async restore(
    @Admin() admin: AdminIdentity,
    @Param('id') id: string,
  ): Promise<AdminEventDetailResponseDto> {
    const detail = await this.eventsService.moderateEvent(admin, id, {
      kind: 'RESTORE',
    });
    return AdminEventDetailResponseDto.fromDomain(detail);
  }
}
