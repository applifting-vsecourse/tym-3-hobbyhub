import { GroupsService } from '@/modules/group/services/groups.service';
import { MembershipRequestsService } from '@/modules/membership-request/services/membership-requests.service';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import {
  AdminUserBlock,
  UserBlockViolation,
  userBlockViolations,
} from '@/modules/user-block/domain/user-block';
import { UserBlockRepository } from '@/modules/user-block/repositories/user-block.repository';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const VIOLATION_MESSAGES: Record<UserBlockViolation, string> = {
  SAME_USER: 'A person cannot be blocked from themselves',
  ALREADY_BLOCKED: 'The two people are blocked from each other already',
  NOT_BLOCKED: 'The two people are not blocked from each other',
};

const violationsError = (
  violations: UserBlockViolation[],
): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: violations.map((violation) => VIOLATION_MESSAGES[violation]),
    violations,
  });

// #239, ADR-0022: an administrator blocks two people from each other. The
// other modules then keep them apart (UserBlockVisibility); this service
// writes the block and tidies up what already ties the two together.
@Injectable()
export class UserBlocksService {
  constructor(
    private readonly repository: UserBlockRepository,
    private readonly participationRequests: ParticipationRequestsService,
    private readonly membershipRequests: MembershipRequestsService,
    private readonly groups: GroupsService,
  ) {}

  async listBlocksOf(userId: string): Promise<AdminUserBlock[]> {
    await this.assertUsersExist([userId]);
    return this.repository.listAdminBlocksOf(userId);
  }

  // The block first, so nothing new ties the two together while the old ties
  // are undone. Those go quietly: neither of them may learn of the block.
  async block(
    admin: AdminIdentity,
    userId: string,
    otherUserId: string,
    reason: string,
    now: Date = new Date(),
  ): Promise<AdminUserBlock[]> {
    const violations = userBlockViolations(userId, otherUserId);
    if (violations.length > 0) throw violationsError(violations);
    await this.assertUsersExist([userId, otherUserId]);

    const created = await this.repository.createAdminBlock({
      a: userId,
      b: otherUserId,
      adminId: admin.id,
      reason: reason.trim(),
    });
    if (!created) throw violationsError(['ALREADY_BLOCKED']);

    await this.participationRequests.detachBlockedPair(
      userId,
      otherUserId,
      now,
    );
    await this.membershipRequests.closeBlockedPair(userId, otherUserId, now);
    await this.groups.removeBlockedPair(userId, otherUserId);
    return this.repository.listAdminBlocksOf(userId);
  }

  // Ends the block; what it undid stays undone (ADR-0022).
  async unblock(
    admin: AdminIdentity,
    userId: string,
    otherUserId: string,
  ): Promise<void> {
    const removed = await this.repository.deleteAdminBlock({
      a: userId,
      b: otherUserId,
      adminId: admin.id,
    });
    if (!removed) throw violationsError(['NOT_BLOCKED']);
  }

  private async assertUsersExist(ids: string[]): Promise<void> {
    const existing = await this.repository.existingUserIds(ids);
    if (ids.some((id) => !existing.includes(id))) {
      throw new NotFoundException('User not found');
    }
  }
}
