import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
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
import { CreateParticipationRequestDto } from './dto/create-participation-request.dto';
import {
  MyRequestStateResponseDto,
  ParticipationRequestResponseDto,
} from './dto/participation-request.response.dto';
import { participationRequestsValidationPipe } from './participation-requests-validation.pipe';

// F-06.1 requests to join, seen by the applicant. The organizer's side
// (listing and deciding them) is F-05.7.
@ApiTags('participation-requests')
@Controller('events/:eventId/requests')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(participationRequestsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
@ApiResponse({ status: 404, description: 'Event not found or not public' })
export class ParticipationRequestsController {
  constructor(private readonly service: ParticipationRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ask to join the event as the signed-in user' })
  @ApiResponse({ status: 201, type: ParticipationRequestResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid message, or the event refuses the request; `violations` says why',
  })
  async create(
    @User() user: Identity,
    @Param('eventId') eventId: string,
    @Body() body: CreateParticipationRequestDto,
  ): Promise<ParticipationRequestResponseDto> {
    const request = await this.service.requestToJoin(
      user,
      eventId,
      body.message,
    );
    return ParticipationRequestResponseDto.fromDomain(request);
  }

  @Get('mine')
  @ApiOperation({
    summary:
      "The signed-in user's request on the event and whether they may ask",
  })
  @ApiResponse({ status: 200, type: MyRequestStateResponseDto })
  async mine(
    @User() user: Identity,
    @Param('eventId') eventId: string,
  ): Promise<MyRequestStateResponseDto> {
    const state = await this.service.getMyRequestState(user, eventId);
    return MyRequestStateResponseDto.fromDomain(state);
  }

  @Delete('mine')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Withdraw the signed-in user's pending request" })
  @ApiResponse({ status: 204, description: 'Withdrawn' })
  async withdraw(
    @User() user: Identity,
    @Param('eventId') eventId: string,
  ): Promise<void> {
    await this.service.withdrawMyRequest(user, eventId);
  }
}
