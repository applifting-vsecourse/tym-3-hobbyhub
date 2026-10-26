import { PrismaService } from '@/core/prisma/prisma.service';
import { CancellationReason } from '@/modules/cancellation-reason/domain/cancellation-reason';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CancellationReasonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<CancellationReason[]> {
    const reasons = await this.prisma.cancellationReason.findMany({
      orderBy: { name: 'asc' },
    });
    return reasons.map(({ id, name }) => ({ id, name }));
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.cancellationReason.count({ where: { id } });
    return count > 0;
  }
}
