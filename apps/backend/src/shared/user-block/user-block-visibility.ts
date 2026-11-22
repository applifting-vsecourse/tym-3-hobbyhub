import { PrismaService } from '@/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

// #239, ADR-0022: who must not see whom. Every module that shows people or
// what they made asks here and hands the ids to its own queries; the
// `user-block` module, which writes the blocks, depends on those modules, so
// this read side lives apart and nothing runs in a circle.
//
// A block an administrator made applies both ways. A block a user makes (#65,
// ADR-0031) applies one way: the blocker's content does not exist for the
// blocked. The blocker still sees the blocked, but sends them no requests and
// hears nothing from them.
@Injectable()
export class UserBlockVisibility {
  constructor(private readonly prisma: PrismaService) {}

  /** The people whose content does not exist for `viewerId`. */
  async hiddenFor(viewerId: string | undefined): Promise<string[]> {
    if (!viewerId) return [];
    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockedId: viewerId },
          { blockerId: viewerId, source: 'ADMINISTRATOR' },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    return otherSides(rows, viewerId);
  }

  /** The people who must not see `ownerId`'s content. */
  async hiddenFrom(ownerId: string): Promise<string[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: ownerId },
          { blockedId: ownerId, source: 'ADMINISTRATOR' },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    return otherSides(rows, ownerId);
  }

  /** #65: the people `userId` blocked themselves. */
  async blockedBy(userId: string): Promise<string[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId: userId, source: 'USER' },
      select: { blockedId: true },
    });
    return rows.map((row) => row.blockedId);
  }

  /**
   * #65: whose doings `userId` never hears of: the people hidden from them
   * and the people they blocked themselves.
   */
  async mutedFor(userId: string): Promise<string[]> {
    const [hidden, blocked] = await Promise.all([
      this.hiddenFor(userId),
      this.blockedBy(userId),
    ]);
    return [...new Set([...hidden, ...blocked])];
  }

  /**
   * #65: who must not hear of what `actorId` did: the people who must not see
   * them and the people who blocked them.
   */
  async notHearingFrom(actorId: string): Promise<string[]> {
    const [hidden, blockers] = await Promise.all([
      this.hiddenFrom(actorId),
      this.prisma.userBlock.findMany({
        where: { blockedId: actorId, source: 'USER' },
        select: { blockerId: true },
      }),
    ]);
    return [...new Set([...hidden, ...blockers.map((row) => row.blockerId)])];
  }
}

const otherSides = (
  rows: { blockerId: string; blockedId: string }[],
  userId: string,
): string[] => [
  ...new Set(
    rows.map((row) =>
      row.blockerId === userId ? row.blockedId : row.blockerId,
    ),
  ),
];
