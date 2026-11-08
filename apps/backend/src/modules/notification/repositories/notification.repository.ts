import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  NewNotification,
  Notification,
  NotificationFilter,
  NotificationKind,
  NotificationPage,
  NotificationPayload,
  notificationTypesOf,
  Page,
} from '@/modules/notification/domain/notification';
import { NotificationForEmail } from '@/modules/notification/domain/notification-email';
import { Injectable } from '@nestjs/common';

// The rows the text is made of, besides the notification itself. Only public
// names come along (visibility matrix F-13.8).
const include = {
  actor: { select: { id: true, name: true } },
  event: { select: { id: true, title: true } },
  group: { select: { id: true, name: true } },
} as const satisfies Prisma.NotificationInclude;

type NotificationRow = Prisma.NotificationGetPayload<{
  include: typeof include;
}>;

// The column is JSON; anything that is not an object is treated as empty.
const payloadOf = (value: Prisma.JsonValue): NotificationPayload =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as NotificationPayload)
    : {};

const mapToDomain = (row: NotificationRow): Notification => ({
  id: row.id,
  type: row.type,
  payload: payloadOf(row.payload),
  createdAt: row.createdAt,
  readAt: row.readAt,
  recipientId: row.recipientId,
  actor: row.actor,
  event: row.event,
  group: row.group,
});

// A kind is the set of its types; without one, every type.
const whereKind = (kind?: NotificationKind): Prisma.NotificationWhereInput =>
  kind === undefined ? {} : { type: { in: [...notificationTypesOf(kind)] } };

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // One row per recipient, all in one write. Returns the ids of the rows, for
  // the e-mails made of them (F-09.5).
  async createForRecipients(data: NewNotification): Promise<string[]> {
    if (data.recipientIds.length === 0) return [];
    const rows = await this.prisma.notification.createManyAndReturn({
      data: data.recipientIds.map((recipientId) => ({
        recipientId,
        type: data.type,
        actorId: data.actorId,
        eventId: data.eventId ?? null,
        groupId: data.groupId ?? null,
        payload: (data.payload ?? {}) as Prisma.InputJsonObject,
      })),
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  // F-09.5: the notifications with what their e-mail needs besides the text:
  // the recipient's own address, and whether they have verified it.
  async findForEmail(ids: readonly string[]): Promise<NotificationForEmail[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.notification.findMany({
      where: { id: { in: [...ids] } },
      include: {
        ...include,
        recipient: { select: { email: true, emailVerified: true } },
      },
    });
    return rows.map((row) => ({
      ...mapToDomain(row),
      recipient: row.recipient,
    }));
  }

  // The recipient's notifications, newest first, a page at a time; `total`
  // counts the ones the filter lets through.
  async listOf(
    recipientId: string,
    page: Page,
    filter: NotificationFilter = {},
  ): Promise<NotificationPage> {
    const where: Prisma.NotificationWhereInput = {
      recipientId,
      ...(filter.read === undefined
        ? {}
        : { readAt: filter.read ? { not: null } : null }),
      ...whereKind(filter.kind),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items: rows.map(mapToDomain), total };
  }

  countUnread(recipientId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId, readAt: null },
    });
  }

  // Null when the notification is not the recipient's (or does not exist);
  // one already read is returned as it is, so a second click changes nothing.
  async markRead(
    recipientId: string,
    id: string,
    at: Date,
  ): Promise<Notification | null> {
    await this.prisma.notification.updateMany({
      where: { id, recipientId, readAt: null },
      data: { readAt: at },
    });
    const row = await this.prisma.notification.findFirst({
      where: { id, recipientId },
      include,
    });
    return row ? mapToDomain(row) : null;
  }

  // Returns how many were unread until now.
  async markAllRead(
    recipientId: string,
    at: Date,
    kind?: NotificationKind,
  ): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: { recipientId, readAt: null, ...whereKind(kind) },
      data: { readAt: at },
    });
    return count;
  }
}
