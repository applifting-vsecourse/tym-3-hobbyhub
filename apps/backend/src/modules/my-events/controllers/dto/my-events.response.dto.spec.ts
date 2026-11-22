import { EventListItemResponseDto } from '@/modules/event/controllers/dto/event-list-item.response.dto';
import { EventListItem } from '@/modules/event/domain/event';
import { MyInterestedEventsResponseDto } from './my-events.response.dto';

// Visibility matrix (#231, #232): a saved event comes as the card everyone
// sees, plus where it stands and the person's own watching; nothing about who
// else saved or watches it, or how many do.
describe('MyInterestedEventsResponseDto', () => {
  it('adds only the state and the own watching to the card of the event list', () => {
    const event = {
      id: 'e1',
      startAt: new Date('2030-01-02T10:00:00Z'),
      endAt: new Date('2030-01-02T12:00:00Z'),
      activity: { id: 'a1', name: 'Florbal', icon: 'florbal' },
      group: null,
    } as unknown as EventListItem;

    const response = MyInterestedEventsResponseDto.fromDomain({
      items: [
        {
          ...event,
          state: 'UPCOMING',
          watchesFreeSpot: true,
          canWatchFreeSpot: false,
        },
      ],
      total: 1,
    });

    expect(Object.keys(response.items[0]!).sort()).toEqual(
      [
        ...Object.keys(EventListItemResponseDto.fromDomain(event)),
        'state',
        'watchesFreeSpot',
        'canWatchFreeSpot',
      ].sort(),
    );
    expect(response.items[0]!.state).toBe('UPCOMING');
  });
});
