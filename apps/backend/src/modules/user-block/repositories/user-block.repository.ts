import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  AdminUserBlock,
  BlockedUser,
  orderedPair,
} from '@/modules/user-block/domain/user-block';
import { recordAuditLogEntry } from '@/shared/audit-log/audit-log';
import { Injectable } from '@nestjs/common';

const userSelect = { select: { id: true, name: true } } as const;

@Injectable()
export class UserBlockRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Which of the ids belong to an account; blocks are between accounts. */
  async existingUserIds(ids: string[]): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  // #239: the blocks an administrator made with this person on either side.
  // #65: and the blocks a user made, whichever of the two made it. The newest
  // first.
  async listAdminBlocksOf(userId: string): Promise<AdminUserBlock[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      include: {
        blocker: userSelect,
        blocked: userSelect,
        createdBy: userSelect,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      source: row.source,
      otherUser: row.blockerId === userId ? row.blocked : row.blocker,
      isBlocker: row.source === 'USER' && row.blockerId === userId,
      reason: row.reason,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
    }));
  }

  // #65: the people the user blocked, the newest first.
  async listBlockedBy(blockerId: string): Promise<BlockedUser[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId, source: 'USER' },
      select: {
        createdAt: true,
        blocked: { select: { id: true, name: true, image: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.blocked.id,
      name: row.blocked.name,
      image: row.blocked.image,
      blockedAt: row.createdAt,
    }));
  }

  // #65: a user's own block, one way. False when it exists already. Not in
  // the audit log, which keeps what administrators do (ADR-0027).
  async createUserBlock(
    blockerId: string,
    blockedId: string,
  ): Promise<boolean> {
    try {
      await this.prisma.userBlock.create({
        data: { blockerId, blockedId, source: 'USER' },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }

  // #65: false when the user had not blocked the other one. An
  // administrator's block of the pair stays.
  async deleteUserBlock(
    blockerId: string,
    blockedId: string,
  ): Promise<boolean> {
    const { count } = await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId, source: 'USER' },
    });
    return count > 0;
  }

  // The block and its audit entries in one transaction (ADR-0022). False
  // when the pair is blocked already: the unique key settles two
  // administrators at once.
  async createAdminBlock(data: {
    a: string;
    b: string;
    adminId: string;
    reason: string;
  }): Promise<boolean> {
    const [blockerId, blockedId] = orderedPair(data.a, data.b);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userBlock.create({
          data: {
            blockerId,
            blockedId,
            createdById: data.adminId,
            reason: data.reason,
            source: 'ADMINISTRATOR',
          },
        });
        for (const [targetId, otherId] of [
          [data.a, data.b],
          [data.b, data.a],
        ]) {
          await recordAuditLogEntry(tx, {
            adminId: data.adminId,
            action: 'USERS_BLOCKED',
            targetType: 'USER',
            targetId,
            description: `${otherId}: ${data.reason}`.slice(0, 500),
          });
        }
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }

  // False when there was no block by an administrator between the two.
  async deleteAdminBlock(data: {
    a: string;
    b: string;
    adminId: string;
  }): Promise<boolean> {
    const [blockerId, blockedId] = orderedPair(data.a, data.b);
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.userBlock.deleteMany({
        where: { blockerId, blockedId, source: 'ADMINISTRATOR' },
      });
      if (count === 0) return false;
      for (const [targetId, otherId] of [
        [data.a, data.b],
        [data.b, data.a],
      ]) {
        await recordAuditLogEntry(tx, {
          adminId: data.adminId,
          action: 'USERS_UNBLOCKED',
          targetType: 'USER',
          targetId,
          description: otherId,
        });
      }
      return true;
    });
  }
}
