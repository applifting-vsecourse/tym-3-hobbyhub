import { GroupsService } from '@/modules/group/services/groups.service';
import { OptionalUser, User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { OptionalUserGuard } from '@/shared/auth/guards/optional-user.guard';
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
import { CreateGroupDto } from './dto/create-group.dto';
import { DiscoverGroupsQueryDto } from './dto/discover-groups.query.dto';
import { GroupPageResponseDto } from './dto/group-page.response.dto';
import {
  GroupMembershipResponseDto,
  GroupResponseDto,
} from './dto/group.response.dto';
import { MyGroupResponseDto } from './dto/my-group.response.dto';
import { NearbyGroupsResponseDto } from './dto/nearby-groups.response.dto';
import { groupsValidationPipe } from './groups-validation.pipe';

@ApiTags('groups')
@Controller('groups')
@ApiCookieAuth()
@UsePipes(groupsValidationPipe)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @UseGuards(AuthenticatedUserGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a group owned by the signed-in user' })
  @ApiResponse({ status: 201, type: GroupResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or activity' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async create(
    @User() user: Identity,
    @Body() body: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    const group = await this.groupsService.createGroup(user, {
      name: body.name,
      activityId: body.activityId,
      description: body.description,
      locationName: body.locationName,
      usualSchedule: body.usualSchedule,
    });
    return GroupResponseDto.fromDomain(group);
  }

  // The list routes come before `:id`, which would otherwise match them.
  @Get('mine')
  @UseGuards(AuthenticatedUserGuard)
  @ApiOperation({ summary: 'List active groups the signed-in user is in' })
  @ApiResponse({ status: 200, type: [MyGroupResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async mine(@User() user: Identity): Promise<MyGroupResponseDto[]> {
    const groups = await this.groupsService.listMyGroups(user);
    return groups.map((group) => MyGroupResponseDto.fromDomain(group));
  }

  @Get('nearby')
  @UseGuards(AuthenticatedUserGuard)
  @ApiOperation({
    summary: "List a few public groups in the signed-in user's city",
  })
  @ApiResponse({ status: 200, type: NearbyGroupsResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async nearby(@User() user: Identity): Promise<NearbyGroupsResponseDto> {
    return NearbyGroupsResponseDto.fromDomain(
      await this.groupsService.listNearbyGroups(user),
    );
  }

  // F-07.8: open to visitors too; a signed-in user does not see their own
  // groups here.
  @Get('discover')
  @UseGuards(OptionalUserGuard)
  @ApiOperation({
    summary:
      'Page through public groups; for a signed-in user, those they are not in',
  })
  @ApiResponse({ status: 200, type: GroupPageResponseDto })
  async discover(
    @OptionalUser() user: Identity | undefined,
    @Query() query: DiscoverGroupsQueryDto,
  ): Promise<GroupPageResponseDto> {
    return GroupPageResponseDto.fromDomain(
      await this.groupsService.discoverGroups(user, query.cursor),
    );
  }

  // Public detail (F-02.5): a visitor needs no account. It shows the member
  // count, never the members.
  @Get(':id')
  @ApiOperation({ summary: 'Get a public group' })
  @ApiResponse({ status: 200, type: GroupResponseDto })
  @ApiResponse({ status: 404, description: 'Group not found or not public' })
  async detail(@Param('id') id: string): Promise<GroupResponseDto> {
    const group = await this.groupsService.getPublicGroup(id);
    return GroupResponseDto.fromDomain(group);
  }

  @Get(':id/membership')
  @UseGuards(AuthenticatedUserGuard)
  @ApiOperation({ summary: 'Is the signed-in user a member of the group' })
  @ApiResponse({ status: 200, type: GroupMembershipResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async membership(
    @User() user: Identity,
    @Param('id') id: string,
  ): Promise<GroupMembershipResponseDto> {
    const role = await this.groupsService.getMemberRole(id, user.id);
    return { isMember: role !== null, role };
  }

  @Delete(':id/membership')
  @UseGuards(AuthenticatedUserGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'The signed-in user leaves the group' })
  @ApiResponse({ status: 204, description: 'Left the group' })
  @ApiResponse({ status: 400, description: 'The owner cannot leave' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Not a member of the group' })
  async leave(@User() user: Identity, @Param('id') id: string): Promise<void> {
    await this.groupsService.leaveGroup(id, user.id);
  }
}
