import { PrismaService } from '@/core/prisma/prisma.service';
import { AdministratorListItem } from '@/modules/administrator/domain/administrator';
import { Injectable } from '@nestjs/common';

// Reads only: administrators are written by BetterAuth (`shared/admin-auth`).
@Injectable()
export class AdministratorRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Few by nature, so the whole list, oldest first.
  listAdministrators(): Promise<AdministratorListItem[]> {
    return this.prisma.administrator.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
}
