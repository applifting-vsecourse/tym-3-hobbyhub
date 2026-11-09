import { notificationsValidationPipe } from '@/modules/notification/controllers/notifications-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { ReadAllNotificationsQuery } from './read-all-notifications.query';

// Query parameters arrive as strings.
const validate = (
  query: Record<string, string>,
): Promise<ReadAllNotificationsQuery> =>
  notificationsValidationPipe.transform(query, {
    type: 'query',
    metatype: ReadAllNotificationsQuery,
  }) as Promise<ReadAllNotificationsQuery>;

describe('ReadAllNotificationsQuery', () => {
  it('means every kind without a kind', async () => {
    await expect(validate({})).resolves.toEqual({});
  });

  it('reads the kind', async () => {
    await expect(validate({ kind: 'groups' })).resolves.toEqual({
      kind: 'groups',
    });
  });

  it.each([
    ['an unknown kind', { kind: 'messages' }],
    ['a type instead of a kind', { kind: 'GROUP_INVITATION' }],
    ['an unknown parameter', { read: 'false' }],
  ])('refuses %s', async (_, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
