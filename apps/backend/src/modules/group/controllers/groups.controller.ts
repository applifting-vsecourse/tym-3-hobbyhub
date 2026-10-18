import { GroupsService } from '@/modules/group/services/groups.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
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
import { GroupResponseDto } from './dto/group.response.dto';
import { MyGroupResponseDto } from './dto/my-group.response.dto';
import { NearbyGroupsResponseDto } from './dto/nearby-groups.response.dto';

@ApiTags('groups')
@Controller('groups')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
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
  @ApiOperation({ summary: 'List active groups the signed-in user is in' })
  @ApiResponse({ status: 200, type: [MyGroupResponseDto] })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async mine(@User() user: Identity): Promise<MyGroupResponseDto[]> {
    const groups = await this.groupsService.listMyGroups(user);
    return groups.map((group) => MyGroupResponseDto.fromDomain(group));
  }

  @Get('nearby')
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

  @Get('discover')
  @ApiOperation({
    summary: 'Page through public groups the signed-in user is not in',
  })
  @ApiResponse({ status: 200, type: GroupPageResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  async discover(
    @User() user: Identity,
    @Query() query: DiscoverGroupsQueryDto,
  ): Promise<GroupPageResponseDto> {
    return GroupPageResponseDto.fromDomain(
      await this.groupsService.discoverGroups(user, query.cursor),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a group' })
  @ApiResponse({ status: 200, type: GroupResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async detail(@Param('id') id: string): Promise<GroupResponseDto> {
    const group = await this.groupsService.getGroup(id);
    return GroupResponseDto.fromDomain(group);
  }
}
