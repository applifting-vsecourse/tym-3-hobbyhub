import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  AdministratorListItem,
  administratorStatusOf,
} from '@/modules/administrator/domain/administrator';
import { RESET_PASSWORD_IDENTIFIER_PREFIX } from '@/shared/admin-auth/password-links';
import { Injectable } from '@nestjs/common';

// BetterAuth keeps the password on the `credential` account.
const CREDENTIAL = 'credential';

const select = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  deactivatedAt: true,
  createdBy: { select: { id: true, name: true } },
  deactivatedBy: { select: { id: true, name: true } },
  accounts: { where: { providerId: CREDENTIAL }, select: { id: true } },
} as const satisfies Prisma.AdministratorSelect;

type Row = Prisma.AdministratorGetPayload<{ select: typeof select }>;

const toListItem = ({ accounts, ...row }: Row): AdministratorListItem => ({
  ...row,
  status: administratorStatusOf({
    hasPassword: accounts.length > 0,
    deactivatedAt: row.deactivatedAt,
  }),
});

// Can sign in: has a password and was not deactivated.
const activeWhere = {
  deactivatedAt: null,
  accounts: { some: { providerId: CREDENTIAL } },
} as const satisfies Prisma.AdministratorWhereInput;

// The only place that touches the administrators' tables outside BetterAuth.
// Validates nothing: the service decides who may do what.
@Injectable()
export class AdministratorRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Few by nature, so the whole list, oldest first.
  async listAdministrators(): Promise<AdministratorListItem[]> {
    const rows = await this.prisma.administrator.findMany({
      select,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toListItem);
  }

  async getAdministrator(id: string): Promise<AdministratorListItem | null> {
    const row = await this.prisma.administrator.findUnique({
      where: { id },
      select,
    });
    return row ? toListItem(row) : null;
  }

  async findByEmail(email: string): Promise<AdministratorListItem | null> {
    const row = await this.prisma.administrator.findUnique({
      where: { email },
      select,
    });
    return row ? toListItem(row) : null;
  }

  countActive(): Promise<number> {
    return this.prisma.administrator.count({ where: activeWhere });
  }

  // An account without a password: BetterAuth creates the credential when
  // the invitation link is used. Null when the address was taken meanwhile.
  async createInvited(data: {
    email: string;
    name: string;
    createdById: string;
    now: Date;
  }): Promise<AdministratorListItem | null> {
    try {
      const row = await this.prisma.administrator.create({
        data: {
          id: randomUUID(),
          email: data.email,
          name: data.name,
          emailVerified: false,
          createdAt: data.now,
          updatedAt: data.now,
          createdById: data.createdById,
        },
        select,
      });
      return toListItem(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return null;
      }
      throw error;
    }
  }

  // Every link to set a password stops working: a new invitation replaces
  // the old one, a deactivation takes them all away.
  async revokePasswordLinks(administratorId: string): Promise<void> {
    await this.prisma.adminVerification.deleteMany({
      where: {
        value: administratorId,
        identifier: { startsWith: RESET_PASSWORD_IDENTIFIER_PREFIX },
      },
    });
  }

  /**
   * Deactivates and signs out everywhere, with every link revoked. With
   * `keepOneActive`, the active administrators are locked first and false
   * comes back when the target would be the last one: two colleagues who
   * remove each other at the same moment must not leave nobody.
   */
  async deactivate(data: {
    id: string;
    deactivatedById: string;
    keepOneActive: boolean;
    now: Date;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (data.keepOneActive) {
        await tx.$queryRaw`SELECT "id" FROM "administrator" WHERE "deactivatedAt" IS NULL FOR UPDATE`;
        const others = await tx.administrator.count({
          where: { ...activeWhere, id: { not: data.id } },
        });
        if (others === 0) return false;
      }
      const { count } = await tx.administrator.updateMany({
        where: { id: data.id, deactivatedAt: null },
        data: {
          deactivatedAt: data.now,
          deactivatedById: data.deactivatedById,
          updatedAt: data.now,
        },
      });
      if (count === 0) return false;
      await tx.adminSession.deleteMany({ where: { userId: data.id } });
      await tx.adminVerification.deleteMany({
        where: {
          value: data.id,
          identifier: { startsWith: RESET_PASSWORD_IDENTIFIER_PREFIX },
        },
      });
      return true;
    });
  }

  /**
   * Back from deactivation without the old password: it is deleted, with any
   * session and link, so only a new invitation lets them in (ADR-0021).
   */
  async reactivate(id: string, now: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.administrator.updateMany({
        where: { id, deactivatedAt: { not: null } },
        data: { deactivatedAt: null, deactivatedById: null, updatedAt: now },
      });
      if (count === 0) return false;
      await tx.adminAccount.deleteMany({
        where: { userId: id, providerId: CREDENTIAL },
      });
      await tx.adminSession.deleteMany({ where: { userId: id } });
      await tx.adminVerification.deleteMany({
        where: {
          value: id,
          identifier: { startsWith: RESET_PASSWORD_IDENTIFIER_PREFIX },
        },
      });
      return true;
    });
  }
}
