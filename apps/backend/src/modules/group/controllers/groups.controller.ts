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
  Patch,
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
import { GroupMemberResponseDto } from './dto/group-member.response.dto';
import { GroupPageResponseDto } from './dto/group-page.response.dto';
import {
  GroupMembershipResponseDto,
  GroupResponseDto,
} from './dto/group.response.dto';
import { MyGroupResponseDto } from './dto/my-group.response.dto';
import { NearbyGroupsResponseDto } from './dto/nearby-groups.response.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
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
      await this.groupsService.discoverGroups(user, query.cursor, {
        activityIds: query.activityIds,
        search: query.search,
        location: query.location,
      }),
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

  @Get(':id/members')
  @UseGuards(AuthenticatedUserGuard)
  @ApiOperation({ summary: 'List the members of a group (its members only)' })
  @ApiResponse({ status: 200, type: [GroupMemberResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({
    status: 404,
    description: 'Group not found, or the user is not a member',
  })
  async members(
    @User() user: Identity,
    @Param('id') id: string,
  ): Promise<GroupMemberResponseDto[]> {
    const members = await this.groupsService.listMembers(id, user);
    return members.map((member) => GroupMemberResponseDto.fromDomain(member));
  }

  // F-07.3b member management. ADR-0007 decides who may do what to whom;
  // a member without the right gets 403, anyone outside the group 404.
  @Patch(':id/members/:userId')
  @UseGuards(AuthenticatedUserGuard)
  @ApiOperation({ summary: 'Name or demote an admin (the owner only)' })
  @ApiResponse({ status: 200, type: GroupMemberResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid role, or oneself' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'The role does not allow it' })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  async changeMemberRole(
    @User() user: Identity,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: UpdateMemberRoleDto,
  ): Promise<GroupMemberResponseDto> {
    const member = await this.groupsService.changeMemberRole(
      id,
      user,
      userId,
      body.role,
    );
    return GroupMemberResponseDto.fromDomain(member);
  }

  @Delete(':id/members/:userId')
  @UseGuards(AuthenticatedUserGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the group (its admins)' })
  @ApiResponse({ status: 204, description: 'Removed' })
  @ApiResponse({ status: 400, description: 'Oneself: leave instead' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'The role does not allow it' })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  async removeMember(
    @User() user: Identity,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.groupsService.removeMember(id, user, userId);
  }

  @Post(':id/ownership')
  @UseGuards(AuthenticatedUserGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Hand the group over to another member (the owner only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Handed over; the old owner is an admin',
  })
  @ApiResponse({ status: 400, description: 'Invalid input, or oneself' })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  async transferOwnership(
    @User() user: Identity,
    @Param('id') id: string,
    @Body() body: TransferOwnershipDto,
  ): Promise<void> {
    await this.groupsService.transferOwnership(id, user, body.userId);
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
