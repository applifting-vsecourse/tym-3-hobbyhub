import { EventListItemResponseDto } from '@/modules/event/controllers/dto/event-list-item.response.dto';
import { EventListItem } from '@/modules/event/domain/event';
import { MyInterestedEventsResponseDto } from './my-events.response.dto';

// Visibility matrix (#231): a saved event comes as the card everyone sees,
// plus where it stands; nothing about who else saved it or how many did.
describe('MyInterestedEventsResponseDto', () => {
  it('adds only the state to the card of the event list', () => {
    const event = {
      id: 'e1',
      startAt: new Date('2030-01-02T10:00:00Z'),
      endAt: new Date('2030-01-02T12:00:00Z'),
      activity: { id: 'a1', name: 'Florbal', icon: 'florbal' },
      group: null,
    } as unknown as EventListItem;

    const response = MyInterestedEventsResponseDto.fromDomain({
      items: [{ ...event, state: 'UPCOMING' }],
      total: 1,
    });

    expect(Object.keys(response.items[0]!).sort()).toEqual(
      [
        ...Object.keys(EventListItemResponseDto.fromDomain(event)),
        'state',
      ].sort(),
    );
    expect(response.items[0]!.state).toBe('UPCOMING');
  });
});
