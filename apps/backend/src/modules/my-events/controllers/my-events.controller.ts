import { MyEventsService } from '@/modules/my-events/services/my-events.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MyEventsResponseDto } from './dto/my-events.response.dto';

// F-06.3: the signed-in user's own overview, never anyone else's.
@ApiTags('my-events')
@Controller('my-events')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@ApiResponse({ status: 401, description: 'Not signed in' })
export class MyEventsController {
  constructor(private readonly service: MyEventsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Upcoming applications with their state, and the events the user organizes',
  })
  @ApiResponse({ status: 200, type: MyEventsResponseDto })
  async overview(@User() user: Identity): Promise<MyEventsResponseDto> {
    return MyEventsResponseDto.fromDomain(await this.service.getOverview(user));
  }
}
