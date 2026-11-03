import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
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
import { ListNotificationsQuery } from './dto/list-notifications.query';
import {
  NotificationCountResponseDto,
  NotificationPageResponseDto,
  NotificationResponseDto,
} from './dto/notification.response.dto';
import { notificationsValidationPipe } from './notifications-validation.pipe';

// #152: the signed-in user's own notifications. Whose they are comes from the
// session; someone else's do not exist here (404).
@ApiTags('notifications')
@Controller('notifications')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(notificationsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications, newest first' })
  @ApiResponse({ status: 200, type: NotificationPageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid limit or offset' })
  async list(
    @User() user: Identity,
    @Query() query: ListNotificationsQuery,
  ): Promise<NotificationPageResponseDto> {
    const page = await this.service.listMine(user, {
      limit: query.limit,
      offset: query.offset,
    });
    return NotificationPageResponseDto.fromDomain(page);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'How many of my notifications are unread' })
  @ApiResponse({ status: 200, type: NotificationCountResponseDto })
  async unreadCount(
    @User() user: Identity,
  ): Promise<NotificationCountResponseDto> {
    return { count: await this.service.countUnread(user) };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all my notifications read' })
  @ApiResponse({
    status: 200,
    type: NotificationCountResponseDto,
    description: 'How many were unread until now',
  })
  async readAll(@User() user: Identity): Promise<NotificationCountResponseDto> {
    return { count: await this.service.markAllRead(user) };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark one of my notifications read' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Not my notification' })
  async read(
    @User() user: Identity,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.service.markRead(user, id);
    return NotificationResponseDto.fromDomain(notification);
  }
}
