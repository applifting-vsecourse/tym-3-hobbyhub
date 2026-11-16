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
  FriendSearchPageResponseDto,
} from './dto/friends.response.dto';
import { SearchFriendsQuery } from './dto/search-friends.query';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { friendsValidationPipe } from './friends-validation.pipe';

// #225, ADR-0026: finding people, asking them to become friends and taking
// the request back. Who acts
// is the signed-in user, never an id from the request.
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
      'Find people by part of their name or username (never by e-mail), a page at a time',
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
}
