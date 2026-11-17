import { UserBlocksService } from '@/modules/user-block/services/user-blocks.service';
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
import { BlockAsUserDto } from './dto/block-as-user.dto';
import { BlockedUserResponseDto } from './dto/blocked-user.response.dto';
import { userBlocksValidationPipe } from './user-blocks-validation.pipe';

// #65, ADR-0028: a signed-in user blocks another user, one way, and can take
// it back. The blocker is always the session.
@ApiTags('blocks')
@Controller('blocks')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(userBlocksValidationPipe)
@ApiResponse({ status: 401, description: 'Not signed in' })
export class UserBlocksController {
  constructor(private readonly userBlocksService: UserBlocksService) {}

  @Get()
  @ApiOperation({ summary: 'The people I blocked, newest first' })
  @ApiResponse({ status: 200, type: [BlockedUserResponseDto] })
  async list(@User() user: Identity): Promise<BlockedUserResponseDto[]> {
    const blocked = await this.userBlocksService.listMine(user);
    return blocked.map((item) => BlockedUserResponseDto.fromDomain(item));
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Block a person: they no longer see me or what I run, and nobody is told. Our waiting requests close, the seats and memberships one of us holds with the other end, and so does our friendship',
  })
  @ApiResponse({ status: 204, description: 'Blocked' })
  @ApiResponse({ status: 400, description: 'Myself, or blocked already' })
  @ApiResponse({ status: 404, description: 'No such user I can see' })
  async block(
    @User() user: Identity,
    @Body() body: BlockAsUserDto,
  ): Promise<void> {
    await this.userBlocksService.blockAsUser(user, body.userId);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unblock a person; what the block undid stays undone',
  })
  @ApiResponse({ status: 204, description: 'Unblocked' })
  @ApiResponse({ status: 400, description: 'I had not blocked them' })
  async unblock(
    @User() user: Identity,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.userBlocksService.unblockAsUser(user, userId);
  }
}
