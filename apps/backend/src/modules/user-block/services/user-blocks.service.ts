import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { GroupsService } from '@/modules/group/services/groups.service';
import { MembershipRequestsService } from '@/modules/membership-request/services/membership-requests.service';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import {
  AdminUserBlock,
  BlockedUser,
  UserBlockViolation,
  userBlockViolations,
} from '@/modules/user-block/domain/user-block';
import { UserBlockRepository } from '@/modules/user-block/repositories/user-block.repository';
import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
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

// #239, ADR-0022: an administrator blocks two people from each other. #65,
// ADR-0028: a user blocks another user, one way. The other modules then keep
// them apart (UserBlockVisibility); this service writes the block and tidies
// up what already ties the two together, the same for both kinds.
@Injectable()
export class UserBlocksService {
  constructor(
    private readonly repository: UserBlockRepository,
    private readonly participationRequests: ParticipationRequestsService,
    private readonly membershipRequests: MembershipRequestsService,
    private readonly groups: GroupsService,
    private readonly friendships: FriendshipService,
    private readonly visibility: UserBlockVisibility,
  ) {}

  // #65: the people the user blocked, for their settings.
  listMine(user: Identity): Promise<BlockedUser[]> {
    return this.repository.listBlockedBy(user.id);
  }

  // #65, ADR-0028: the blocker comes from the session. Only someone the user
  // can see can be blocked; anyone else answers as if they did not exist.
  // The ties go as with an administrator's block, quietly, and blocking again
  // finishes a clean-up that failed halfway.
  async blockAsUser(
    user: Identity,
    otherUserId: string,
    now: Date = new Date(),
  ): Promise<void> {
    const violations = userBlockViolations(user.id, otherUserId);
    if (violations.length > 0) throw violationsError(violations);
    const hidden = await this.visibility.hiddenFor(user.id);
    if (hidden.includes(otherUserId)) {
      throw new NotFoundException('User not found');
    }
    await this.assertUsersExist([otherUserId]);

    const created = await this.repository.createUserBlock(user.id, otherUserId);
    await this.undoTies(user.id, otherUserId, now);
    if (!created) throw violationsError(['ALREADY_BLOCKED']);
  }

  // #65: ends the user's own block; what it undid stays undone.
  async unblockAsUser(user: Identity, otherUserId: string): Promise<void> {
    const removed = await this.repository.deleteUserBlock(user.id, otherUserId);
    if (!removed) throw violationsError(['NOT_BLOCKED']);
  }

  async listBlocksOf(userId: string): Promise<AdminUserBlock[]> {
    await this.assertUsersExist([userId]);
    return this.repository.listAdminBlocksOf(userId);
  }

  // The block first, so nothing new ties the two together while the old ties
  // are undone. Those go quietly: neither of them may learn of the block.
  // The ties are undone even when the pair is blocked already, so blocking
  // again finishes a clean-up that failed halfway; undoing them twice is
  // harmless.
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
    await this.undoTies(userId, otherUserId, now);
    if (!created) throw violationsError(['ALREADY_BLOCKED']);
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

  private async undoTies(a: string, b: string, now: Date): Promise<void> {
    await this.participationRequests.detachBlockedPair(a, b, now);
    await this.membershipRequests.closeBlockedPair(a, b, now);
    await this.groups.removeBlockedPair(a, b);
    // ADR-0026: blocking ends the friendship and the pending requests.
    await this.friendships.removeBlockedPair(a, b, now);
  }

  private async assertUsersExist(ids: string[]): Promise<void> {
    const existing = await this.repository.existingUserIds(ids);
    if (ids.some((id) => !existing.includes(id))) {
      throw new NotFoundException('User not found');
    }
  }
}
