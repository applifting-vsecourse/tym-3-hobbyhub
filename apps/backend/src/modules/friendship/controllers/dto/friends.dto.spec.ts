import { friendsValidationPipe } from '@/modules/friendship/controllers/friends-validation.pipe';
import { FRIEND_SEARCH_MAX_LENGTH } from '@/modules/friendship/domain/friendship';
import { BadRequestException } from '@nestjs/common';
import {
  FriendSearchItemResponseDto,
  FriendSearchPageResponseDto,
  ReceivedFriendRequestPageResponseDto,
  ReceivedFriendRequestResponseDto,
} from './friends.response.dto';
import { ListReceivedFriendRequestsQuery } from './list-received-friend-requests.query';
import { SearchFriendsQuery } from './search-friends.query';
import { SendFriendRequestDto } from './send-friend-request.dto';

const validate = (
  metatype:
    | typeof SearchFriendsQuery
    | typeof SendFriendRequestDto
    | typeof ListReceivedFriendRequestsQuery,
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

  it('allows the last page within the 100 people', async () => {
    await expect(
      validate(SearchFriendsQuery, { q: 'nov', offset: '80' }, 'query'),
    ).resolves.toMatchObject({ offset: 80 });
  });

  it.each([
    [{}],
    [{ q: 'n' }],
    [{ q: ' n ' }],
    [{ q: 'x'.repeat(FRIEND_SEARCH_MAX_LENGTH + 1) }],
    [{ q: 'nov', offset: '-1' }],
    // Review of #225: no page past the 100th person.
    [{ q: 'nov', offset: '100' }],
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
      isCapped: false,
    });
    expect(Object.keys(response.items[0]).sort()).toEqual([
      'id',
      'image',
      'name',
      'relation',
    ]);
  });
});

describe('ListReceivedFriendRequestsQuery (#228)', () => {
  it('starts at the first page', async () => {
    await expect(
      validate(ListReceivedFriendRequestsQuery, {}, 'query'),
    ).resolves.toMatchObject({ offset: 0 });
  });

  it('reads the offset from the address', async () => {
    await expect(
      validate(ListReceivedFriendRequestsQuery, { offset: '20' }, 'query'),
    ).resolves.toMatchObject({ offset: 20 });
  });

  it.each([[{ offset: '-1' }], [{ offset: 'abc' }], [{ status: 'ACCEPTED' }]])(
    'refuses %j',
    async (query) => {
      await expect(
        validate(ListReceivedFriendRequestsQuery, query, 'query'),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});

describe('ReceivedFriendRequestPageResponseDto (#228)', () => {
  it('carries only the public profile of the sender, never the e-mail', () => {
    const request = {
      id: 'r1',
      requestedAt: new Date('2026-11-15T10:00:00Z'),
      sender: {
        id: 'u2',
        name: 'Libor',
        image: null,
        email: 'libor@example.com',
      },
      recipientId: 'u1',
    } as unknown as ReceivedFriendRequestResponseDto;
    const response = ReceivedFriendRequestPageResponseDto.fromDomain({
      items: [request],
      total: 1,
      nextOffset: null,
    });
    expect(Object.keys(response.items[0]).sort()).toEqual([
      'id',
      'requestedAt',
      'sender',
    ]);
    expect(Object.keys(response.items[0].sender).sort()).toEqual([
      'id',
      'image',
      'name',
    ]);
  });
});
