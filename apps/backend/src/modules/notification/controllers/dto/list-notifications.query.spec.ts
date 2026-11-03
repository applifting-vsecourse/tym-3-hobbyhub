import { notificationsValidationPipe } from '@/modules/notification/controllers/notifications-validation.pipe';
import {
  NOTIFICATION_LIST_DEFAULT_LIMIT,
  NOTIFICATION_LIST_MAX_LIMIT,
} from '@/modules/notification/domain/notification';
import { BadRequestException } from '@nestjs/common';
import { ListNotificationsQuery } from './list-notifications.query';

// Query parameters arrive as strings.
const validate = (
  query: Record<string, string>,
): Promise<ListNotificationsQuery> =>
  notificationsValidationPipe.transform(query, {
    type: 'query',
    metatype: ListNotificationsQuery,
  }) as Promise<ListNotificationsQuery>;

describe('ListNotificationsQuery', () => {
  it('starts at the first page by default', async () => {
    await expect(validate({})).resolves.toEqual({
      limit: NOTIFICATION_LIST_DEFAULT_LIMIT,
      offset: 0,
    });
  });

  it('reads the page from the query', async () => {
    await expect(validate({ limit: '10', offset: '20' })).resolves.toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it.each([
    ['a limit of 0', { limit: '0' }],
    [
      'a limit over the maximum',
      { limit: String(NOTIFICATION_LIST_MAX_LIMIT + 1) },
    ],
    ['a negative offset', { offset: '-1' }],
    ['a limit that is not a number', { limit: 'abc' }],
    ['an unknown parameter', { unread: 'true' }],
  ])('refuses %s', async (_, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
