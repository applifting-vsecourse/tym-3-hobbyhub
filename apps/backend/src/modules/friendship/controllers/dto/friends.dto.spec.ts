import { friendsValidationPipe } from '@/modules/friendship/controllers/friends-validation.pipe';
import { FRIEND_SEARCH_MAX_LENGTH } from '@/modules/friendship/domain/friendship';
import { BadRequestException } from '@nestjs/common';
import {
  FriendSearchItemResponseDto,
  FriendSearchPageResponseDto,
} from './friends.response.dto';
import { SearchFriendsQuery } from './search-friends.query';
import { SendFriendRequestDto } from './send-friend-request.dto';

const validate = (
  metatype: typeof SearchFriendsQuery | typeof SendFriendRequestDto,
  value: unknown,
  type: 'query' | 'body',
): Promise<unknown> =>
  friendsValidationPipe.transform(value, { type, metatype });

describe('SearchFriendsQuery', () => {
  it('trims the text and starts at the first page', async () => {
    await expect(
      validate(SearchFriendsQuery, { q: '  nov ' }, 'query'),
    ).resolves.toMatchObject({ q: 'nov', offset: 0 });
  });

  it('reads the offset from the address', async () => {
    await expect(
      validate(SearchFriendsQuery, { q: 'nov', offset: '20' }, 'query'),
    ).resolves.toMatchObject({ offset: 20 });
  });

  it.each([
    [{}],
    [{ q: 'n' }],
    [{ q: ' n ' }],
    [{ q: 'x'.repeat(FRIEND_SEARCH_MAX_LENGTH + 1) }],
    [{ q: 'nov', offset: '-1' }],
    [{ q: 'nov', offset: 'abc' }],
    [{ q: 'nov', email: 'libor@example.com' }],
  ])('refuses %j', async (query) => {
    await expect(
      validate(SearchFriendsQuery, query, 'query'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SendFriendRequestDto', () => {
  it('accepts the recipient', async () => {
    await expect(
      validate(SendFriendRequestDto, { recipientId: 'u2' }, 'body'),
    ).resolves.toMatchObject({ recipientId: 'u2' });
  });

  // The sender comes from the session; a body that names one is refused.
  it.each([
    [{}],
    [{ recipientId: '' }],
    [{ recipientId: 'u2', senderId: 'u3' }],
  ])('refuses %j', async (body) => {
    await expect(
      validate(SendFriendRequestDto, body, 'body'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('FriendSearchPageResponseDto', () => {
  it('carries only the public profile, never the e-mail', () => {
    // Even a row with private columns spread in must not reach the response.
    const person = {
      id: 'u2',
      name: 'NovyHrac',
      image: null,
      relation: 'none',
      email: 'libor@example.com',
      birthYear: 1990,
    } as unknown as FriendSearchItemResponseDto;
    const response = FriendSearchPageResponseDto.fromDomain({
      items: [person],
      nextOffset: null,
    });
    expect(Object.keys(response.items[0]).sort()).toEqual([
      'id',
      'image',
      'name',
      'relation',
    ]);
  });
});
