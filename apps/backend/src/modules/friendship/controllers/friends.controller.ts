import { FriendshipService } from '@/modules/friendship/services/friendship.service';
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
  FriendRelationResponseDto,
  FriendRequestCountResponseDto,
  FriendSearchPageResponseDto,
  ReceivedFriendRequestPageResponseDto,
} from './dto/friends.response.dto';
import { ListReceivedFriendRequestsQuery } from './dto/list-received-friend-requests.query';
import { SearchFriendsQuery } from './dto/search-friends.query';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { friendsValidationPipe } from './friends-validation.pipe';

// #225, #228, ADR-0026: finding people, asking them to become friends, taking
// the request back, and deciding the requests I received. Who acts is the
// signed-in user, never an id from the request.
@ApiTags('friends')
@Controller('friends')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(friendsValidationPipe)
export class FriendsController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Get('search')
  @ApiOperation({
    summary:
      'Find people by part of their nickname (never by e-mail), a page at a time, at most 100',
  })
  @ApiResponse({ status: 200, type: FriendSearchPageResponseDto })
  @ApiResponse({ status: 400, description: 'Text too short or too long' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async search(
    @User() user: Identity,
    @Query() query: SearchFriendsQuery,
  ): Promise<FriendSearchPageResponseDto> {
    return FriendSearchPageResponseDto.fromDomain(
      await this.friendshipService.search(user, query.q, query.offset),
    );
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Ask someone to become my friend' })
  @ApiResponse({ status: 201, type: FriendRelationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or to oneself' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such user' })
  @ApiResponse({
    status: 409,
    description: 'Already friends, or a request already waits either way',
  })
  async sendRequest(
    @User() user: Identity,
    @Body() body: SendFriendRequestDto,
  ): Promise<FriendRelationResponseDto> {
    const sent = await this.friendshipService.sendRequest(
      user,
      body.recipientId,
    );
    return { relation: sent.relation };
  }

  @Delete('requests/:recipientId')
  @ApiOperation({
    summary: 'Withdraw my pending friend request to this person',
  })
  @ApiResponse({ status: 200, type: FriendRelationResponseDto })
  @ApiResponse({ status: 400, description: 'To oneself' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 409,
    description: 'No pending request from me (never sent, or decided)',
  })
  async withdrawRequest(
    @User() user: Identity,
    @Param('recipientId') recipientId: string,
  ): Promise<FriendRelationResponseDto> {
    return {
      relation: await this.friendshipService.withdrawRequest(user, recipientId),
    };
  }

  @Get('requests/received')
  @ApiOperation({
    summary: 'The friend requests waiting for my decision, newest first',
  })
  @ApiResponse({ status: 200, type: ReceivedFriendRequestPageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid offset' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async listReceivedRequests(
    @User() user: Identity,
    @Query() query: ListReceivedFriendRequestsQuery,
  ): Promise<ReceivedFriendRequestPageResponseDto> {
    return ReceivedFriendRequestPageResponseDto.fromDomain(
      await this.friendshipService.listReceivedRequests(user, query.offset),
    );
  }

  @Get('requests/received/count')
  @ApiOperation({
    summary: 'How many friend requests wait for my decision (the tab badge)',
  })
  @ApiResponse({ status: 200, type: FriendRequestCountResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async countReceivedRequests(
    @User() user: Identity,
  ): Promise<FriendRequestCountResponseDto> {
    return {
      count: await this.friendshipService.countReceivedRequests(user),
    };
  }

  @Post('requests/:senderId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept the pending friend request this person sent me',
  })
  @ApiResponse({ status: 200, type: FriendRelationResponseDto })
  @ApiResponse({ status: 400, description: 'From oneself' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such user' })
  @ApiResponse({
    status: 409,
    description: 'No pending request from them (decided or withdrawn)',
  })
  async acceptRequest(
    @User() user: Identity,
    @Param('senderId') senderId: string,
  ): Promise<FriendRelationResponseDto> {
    return {
      relation: await this.friendshipService.acceptRequest(user, senderId),
    };
  }

  @Post('requests/:senderId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reject the pending friend request this person sent me; they are not told',
  })
  @ApiResponse({ status: 200, type: FriendRelationResponseDto })
  @ApiResponse({ status: 400, description: 'From oneself' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'No such user' })
  @ApiResponse({
    status: 409,
    description: 'No pending request from them (decided or withdrawn)',
  })
  async rejectRequest(
    @User() user: Identity,
    @Param('senderId') senderId: string,
  ): Promise<FriendRelationResponseDto> {
    return {
      relation: await this.friendshipService.rejectRequest(user, senderId),
    };
  }
}
