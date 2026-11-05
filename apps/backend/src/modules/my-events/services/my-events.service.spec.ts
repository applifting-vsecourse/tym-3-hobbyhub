import { EventListItem } from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { EventApplicationFacts } from '@/modules/participation-request/domain/participation-request';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { Identity } from '@/shared/auth/domain/identity';
import { mock, MockProxy } from 'jest-mock-extended';
import { MyEventsService } from './my-events.service';

const user = { id: 'u1' } as Identity;
const now = new Date('2030-01-01T12:00:00Z');

const anItem = (id: string, startAt: string): EventListItem =>
  ({ id, startAt: new Date(startAt) }) as EventListItem;

const facts = (
  eventId: string,
  override: Partial<EventApplicationFacts> = {},
): EventApplicationFacts => ({
  eventId,
  eventStatus: 'PUBLISHED',
  seat: null,
  requests: ['PENDING'],
  ...override,
});

describe('MyEventsService', () => {
  let events: MockProxy<EventsService>;
  let requests: MockProxy<ParticipationRequestsService>;
  let service: MyEventsService;

  beforeEach(() => {
    events = mock<EventsService>();
    requests = mock<ParticipationRequestsService>();
    service = new MyEventsService(events, requests);
    events.getUpcomingOrganizedEvents.mockResolvedValue([]);
  });

  it('pairs each event with its status, soonest first', async () => {
    requests.getMyApplicationFacts.mockResolvedValue([
      facts('late'),
      facts('soon', { seat: 'APPROVED', requests: ['APPROVED'] }),
      facts('cancelled', { eventStatus: 'CANCELLED' }),
    ]);
    events.getListItemsByIds.mockResolvedValue([
      anItem('late', '2030-03-01T10:00:00Z'),
      anItem('soon', '2030-01-02T10:00:00Z'),
      anItem('cancelled', '2030-02-01T10:00:00Z'),
    ]);

    const overview = await service.getOverview(user, now);

    expect(
      overview.applications.map(({ event, status }) => [event.id, status]),
    ).toEqual([
      ['soon', 'APPROVED'],
      ['cancelled', 'EVENT_CANCELLED'],
      ['late', 'PENDING'],
    ]);
    expect(requests.getMyApplicationFacts).toHaveBeenCalledWith(user, now);
  });

  it('leaves out events without an application worth showing', async () => {
    requests.getMyApplicationFacts.mockResolvedValue([
      facts('none', { requests: [] }),
    ]);
    events.getListItemsByIds.mockResolvedValue([]);

    const overview = await service.getOverview(user, now);

    expect(overview.applications).toEqual([]);
    expect(events.getListItemsByIds).toHaveBeenCalledWith([]);
  });

  it('returns the events the user organizes beside the applications', async () => {
    const hosted = [anItem('mine', '2030-01-05T10:00:00Z')];
    requests.getMyApplicationFacts.mockResolvedValue([]);
    events.getListItemsByIds.mockResolvedValue([]);
    events.getUpcomingOrganizedEvents.mockResolvedValue(hosted);

    const overview = await service.getOverview(user, now);

    expect(overview.hosted).toBe(hosted);
    expect(events.getUpcomingOrganizedEvents).toHaveBeenCalledWith(user, now);
  });
});
