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
import { GroupResponseDto } from './dto/group.response.dto';
import { groupsValidationPipe } from './groups-validation.pipe';

@ApiTags('groups')
@Controller('groups')
@UseGuards(AuthenticatedUserGuard)
@ApiCookieAuth()
@UsePipes(groupsValidationPipe)
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a group' })
  @ApiResponse({ status: 200, type: GroupResponseDto })
  @ApiResponse({ status: 401, description: 'Not signed in' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  // TODO(F-07.1b #93): every group is public and the list hides cancelled
  // ones, so this returns any group to anyone signed in. Private groups must
  // be shown to members only, and a cancelled group needs a decision too.
  async detail(@Param('id') id: string): Promise<GroupResponseDto> {
    const group = await this.groupsService.getGroup(id);
    return GroupResponseDto.fromDomain(group);
  }
}
