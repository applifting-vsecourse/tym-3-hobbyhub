import { PrismaService } from '@/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

// #239, ADR-0022: who must not see whom. Every module that shows people or
// what they made asks here and hands the ids to its own queries; the
// `user-block` module, which writes the blocks, depends on those modules, so
// this read side lives apart and nothing runs in a circle.
//
// A block an administrator made applies both ways. A block a user makes (#65,
// not built yet) applies one way: the blocker's content does not exist for
// the blocked.
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
          { blockerId: viewerId, createdById: { not: null } },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    return otherSides(rows, viewerId);
  }

  /** The people who must not see `ownerId`'s content, nor hear from them. */
  async hiddenFrom(ownerId: string): Promise<string[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: ownerId },
          { blockedId: ownerId, createdById: { not: null } },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    return otherSides(rows, ownerId);
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
