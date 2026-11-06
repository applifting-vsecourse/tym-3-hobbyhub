import { MembershipRequestsService } from '@/modules/membership-request/services/membership-requests.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { Controller, Get, Query, UseGuards, UsePipes } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MyMembershipRequestPageResponseDto } from './dto/my-membership-request.response.dto';
import { MyMembershipRequestsQueryDto } from './dto/my-membership-requests.query.dto';
import { membershipRequestsValidationPipe } from './membership-requests-validation.pipe';

// F-07.7: the signed-in user's own requests across groups. Its own path, not
// under `groups/`, where `groups/:id` routes would sit next to it.
@ApiTags('membership-requests')
@Controller('membership-requests')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(membershipRequestsValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
export class MyMembershipRequestsController {
  constructor(private readonly service: MembershipRequestsService) {}

  @Get('mine')
  @ApiOperation({
    summary:
      "Page through one section of the signed-in user's requests, newest first; approved ones are in neither",
  })
  @ApiResponse({ status: 200, type: MyMembershipRequestPageResponseDto })
  @ApiResponse({ status: 400, description: 'Missing or unknown `section`' })
  async mine(
    @User() user: Identity,
    @Query() query: MyMembershipRequestsQueryDto,
  ): Promise<MyMembershipRequestPageResponseDto> {
    return MyMembershipRequestPageResponseDto.fromDomain(
      await this.service.listMyRequests(user, query.section, query.cursor),
    );
  }
}
