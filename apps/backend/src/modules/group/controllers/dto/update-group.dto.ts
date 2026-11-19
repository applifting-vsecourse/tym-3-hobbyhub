import { PartialType } from '@nestjs/swagger';
import { CreateGroupDto } from './create-group.dto';

// ADR-0028: what the admins of a group may change; anything left out stays.
// The place cannot be taken away: every group has one.
export class UpdateGroupDto extends PartialType(CreateGroupDto) {}
