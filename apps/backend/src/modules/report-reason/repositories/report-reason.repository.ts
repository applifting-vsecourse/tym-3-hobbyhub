import { PrismaService } from '@/core/prisma/prisma.service';
import { ReportReason } from '@/modules/report-reason/domain/report-reason';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportReasonRepository {
  constructor(private readonly prisma: PrismaService) {}

  // In the order the migration gives them, "Jiné" last.
  async getAll(): Promise<ReportReason[]> {
    const reasons = await this.prisma.reportReason.findMany({
      orderBy: { order: 'asc' },
    });
    return reasons.map(({ id, name }) => ({ id, name }));
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.reportReason.count({ where: { id } });
    return count > 0;
  }
}
