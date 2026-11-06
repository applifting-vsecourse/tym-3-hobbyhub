import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
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
import { CancelParticipationDto } from './dto/cancel-participation.dto';
import { CANCEL_RULE_VIOLATIONS } from './dto/participation-request.response.dto';
import { participationRequestsValidationPipe } from './participation-requests-validation.pipe';

// F-06.4: the seat a request led to, seen by its holder. The seat lives in
// this module because taking it is part of approving a request (ADR-0003).
@ApiTags('participations')
@Controller('events/:eventId/participations')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(participationRequestsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({ status: 404, description: 'Event not found or not public' })
export class ParticipationsController {
  constructor(private readonly service: ParticipationRequestsService) {}

  @Post('mine/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      "Cancel the signed-in user's seat before the event starts; the organizers are told why",
  })
  @ApiResponse({ status: 204, description: 'Cancelled, the seat is free' })
  @ApiResponse({
    status: 400,
    description: `Invalid message, or the seat cannot be cancelled now; \`violations\` says why: ${CANCEL_RULE_VIOLATIONS.join(', ')}`,
  })
  async cancelMine(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Body() body: CancelParticipationDto,
  ): Promise<void> {
    await this.service.cancelMySeat(user, eventId, body.message);
  }
}
