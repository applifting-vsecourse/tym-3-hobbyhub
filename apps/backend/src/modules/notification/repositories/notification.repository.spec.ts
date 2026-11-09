import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { NotificationFilter } from '@/modules/notification/domain/notification';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { NotificationRepository } from './notification.repository';

const aRow = {
  id: 'n1',
  type: 'EVENT_CHANGED',
  payload: { changes: ['TIME'] },
  createdAt: new Date('2030-01-01T12:00:00Z'),
  readAt: null,
  recipientId: 'u1',
  actorId: 'u2',
  eventId: 'e1',
  groupId: null,
  actor: { id: 'u2', name: 'Honza' },
  event: { id: 'e1', title: 'Čtvrteční florbal' },
  group: null,
};

describe('NotificationRepository', () => {
  const setup = (): {
    prisma: DeepMockProxy<PrismaService>;
    repository: NotificationRepository;
  } => {
    const prisma = mockDeep<PrismaService>();
    prisma.notification.findMany.mockResolvedValue([aRow] as never);
    prisma.notification.count.mockResolvedValue(7 as never);
    // The queries handed to the transaction are the mocks' promises already.
    prisma.$transaction.mockImplementation(((queries: Promise<unknown>[]) =>
      Promise.all(queries)) as never);
    return { prisma, repository: new NotificationRepository(prisma) };
  };

  // The `where` both the page and the count were asked with.
  const whereOf = async (
    filter?: NotificationFilter,
  ): Promise<Prisma.NotificationWhereInput> => {
    const { prisma, repository } = setup();
    await repository.listOf('u1', { limit: 10, offset: 20 }, filter);
    const findWhere = prisma.notification.findMany.mock.calls[0]?.[0]?.where;
    const countWhere = prisma.notification.count.mock.calls[0]?.[0]?.where;
    expect(countWhere).toEqual(findWhere);
    return findWhere!;
  };

  it('reads a page of the recipient’s notifications, newest first', async () => {
    const { prisma, repository } = setup();

    const page = await repository.listOf('u1', { limit: 10, offset: 20 });

    expect(page).toEqual({
      items: [
        expect.objectContaining({
          id: 'n1',
          type: 'EVENT_CHANGED',
          payload: { changes: ['TIME'] },
          event: { id: 'e1', title: 'Čtvrteční florbal' },
        }),
      ],
      total: 7,
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 10,
      }),
    );
  });

  it('lists every notification of the recipient without a filter', async () => {
    await expect(whereOf()).resolves.toEqual({ recipientId: 'u1' });
    await expect(whereOf({})).resolves.toEqual({ recipientId: 'u1' });
  });

  it('keeps only the unread ones', async () => {
    await expect(whereOf({ read: false })).resolves.toEqual({
      recipientId: 'u1',
      readAt: null,
    });
  });

  it('keeps only the read ones', async () => {
    await expect(whereOf({ read: true })).resolves.toEqual({
      recipientId: 'u1',
      readAt: { not: null },
    });
  });

  it('turns a kind into its types', async () => {
    await expect(whereOf({ kind: 'events' })).resolves.toEqual({
      recipientId: 'u1',
      type: { in: ['EVENT_CHANGED', 'EVENT_CANCELLED', 'EVENT_BOARD'] },
    });
  });

  it('marks read every unread one of the recipient', async () => {
    const { prisma, repository } = setup();
    prisma.notification.updateMany.mockResolvedValue({ count: 3 } as never);
    const at = new Date('2030-01-01T12:00:00Z');

    await expect(repository.markAllRead('u1', at)).resolves.toBe(3);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { recipientId: 'u1', readAt: null },
      data: { readAt: at },
    });
  });

  it('marks read only the unread ones of a kind', async () => {
    const { prisma, repository } = setup();
    prisma.notification.updateMany.mockResolvedValue({ count: 1 } as never);
    const at = new Date('2030-01-01T12:00:00Z');

    await repository.markAllRead('u1', at, 'groups');
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        recipientId: 'u1',
        readAt: null,
        type: { in: ['GROUP_INVITATION'] },
      },
      data: { readAt: at },
    });
  });

  it('combines both', async () => {
    await expect(whereOf({ read: false, kind: 'groups' })).resolves.toEqual({
      recipientId: 'u1',
      readAt: null,
      type: { in: ['GROUP_INVITATION'] },
    });
  });
});
