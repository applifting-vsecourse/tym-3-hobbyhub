import { UserBlocksService } from '@/modules/user-block/services/user-blocks.service';
import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { Admin } from '@/shared/admin-auth/decorators/admin.decorator';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { AdministratorGuard } from '@/shared/admin-auth/guards/administrator.guard';
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
import { AdminUserBlockResponseDto } from './dto/admin-user-block.response.dto';
import { BlockUserDto } from './dto/block-user.dto';

// #239, ADR-0022: an administrator blocks two people from each other, from
// the detail of one of them.
@ApiTags('admin')
@Controller('admin/users/:userId/blocks')
@ApiCookieAuth()
@UseGuards(AdministratorGuard)
@UsePipes(adminValidationPipe)
export class AdminUserBlocksController {
  constructor(private readonly userBlocksService: UserBlocksService) {}

  @Get()
  @ApiOperation({ summary: 'Who the person is blocked from, newest first' })
  @ApiResponse({ status: 200, type: [AdminUserBlockResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such user' })
  async list(
    @Param('userId') userId: string,
  ): Promise<AdminUserBlockResponseDto[]> {
    const blocks = await this.userBlocksService.listBlocksOf(userId);
    return blocks.map((block) => AdminUserBlockResponseDto.fromDomain(block));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Block the person and another one from each other; their waiting requests to each other close, and the seats and memberships one holds with the other end',
  })
  @ApiResponse({ status: 201, type: [AdminUserBlockResponseDto] })
  @ApiResponse({
    status: 400,
    description: 'Invalid reason, the same person, or blocked already',
  })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  @ApiResponse({ status: 404, description: 'No such user' })
  async block(
    @Admin() admin: AdminIdentity,
    @Param('userId') userId: string,
    @Body() body: BlockUserDto,
  ): Promise<AdminUserBlockResponseDto[]> {
    const blocks = await this.userBlocksService.block(
      admin,
      userId,
      body.otherUserId,
      body.reason,
    );
    return blocks.map((block) => AdminUserBlockResponseDto.fromDomain(block));
  }

  @Delete(':otherUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End the block between the two' })
  @ApiResponse({ status: 204, description: 'The block is gone' })
  @ApiResponse({ status: 400, description: 'The two are not blocked' })
  @ApiResponse({ status: 401, description: 'Not signed in as administrator' })
  async unblock(
    @Admin() admin: AdminIdentity,
    @Param('userId') userId: string,
    @Param('otherUserId') otherUserId: string,
  ): Promise<void> {
    await this.userBlocksService.unblock(admin, userId, otherUserId);
  }
}
