import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  AdminUserBlock,
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

  // #239: the blocks an administrator made with this person on either side,
  // the newest first.
  async listAdminBlocksOf(userId: string): Promise<AdminUserBlock[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: {
        createdById: { not: null },
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      include: {
        blocker: userSelect,
        blocked: userSelect,
        createdBy: userSelect,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      otherUser: row.blockerId === userId ? row.blocked : row.blocker,
      // Set on every block by an administrator (CHECK user_block_admin_reason).
      reason: row.reason ?? '',
      createdAt: row.createdAt,
      createdBy: row.createdBy,
    }));
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
        where: { blockerId, blockedId, createdById: { not: null } },
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
