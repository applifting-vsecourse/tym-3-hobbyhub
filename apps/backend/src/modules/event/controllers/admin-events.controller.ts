import { EventsService } from '@/modules/event/services/events.service';
import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { AdminListQuery } from '@/shared/admin-auth/dto/admin-list.query';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
import {
  Controller,
  Get,
  Param,
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

// #238: events in the administration, read only. Every event, hidden and
// drafts too (visibility matrix: Superadmin).
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
}
