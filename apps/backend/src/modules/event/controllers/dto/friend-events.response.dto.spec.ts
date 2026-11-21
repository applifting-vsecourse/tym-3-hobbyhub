import {
  EventDetail,
  EventFriend,
  EventListItem,
} from '@/modules/event/domain/event';
import { EventDetailResponseDto } from './event-list-item.response.dto';
import { FriendsEventPageResponseDto } from './friend-events.response.dto';

const anItem = {
  id: 'e1',
  title: 'Florbal',
  activity: { id: 'a1', name: 'Florbal', icon: 'florbal' },
  isHidden: false,
} as unknown as EventListItem;

// A friend row with fields that must never leave the server.
const libor = {
  id: 'f1',
  name: 'Libor',
  image: null,
  email: 'libor@example.com',
  friendsSeeUpcomingEvents: true,
} as unknown as EventFriend;

describe('EventDetailResponseDto with friends (#226)', () => {
  const detail = {
    ...anItem,
    status: 'PUBLISHED',
    rating: { count: null, average: null },
  } as unknown as EventDetail;

  it('carries no friends at all for a visitor', () => {
    expect(
      EventDetailResponseDto.fromDomainWithFriends({ event: detail }),
    ).not.toHaveProperty('friends');
  });

  it("carries only the friends' public profile", () => {
    const response = EventDetailResponseDto.fromDomainWithFriends({
      event: detail,
      friends: [libor],
    });
    expect(response.friends).toEqual([
      { id: 'f1', name: 'Libor', image: null },
    ]);
  });

  it('carries an empty list when no friend who allows it goes', () => {
    expect(
      EventDetailResponseDto.fromDomainWithFriends({
        event: detail,
        friends: [],
      }).friends,
    ).toEqual([]);
  });
});

describe('FriendsEventPageResponseDto (#226)', () => {
  it("carries the event card and the friends' public profile only", () => {
    const response = FriendsEventPageResponseDto.fromDomain({
      items: [{ event: anItem, friends: [libor] }],
      total: 1,
      nextOffset: null,
    });
    expect(Object.keys(response.items[0]).sort()).toEqual(['event', 'friends']);
    expect(response.items[0].event).not.toHaveProperty('isHidden');
    expect(Object.keys(response.items[0].friends[0]).sort()).toEqual([
      'id',
      'image',
      'name',
    ]);
  });
});
