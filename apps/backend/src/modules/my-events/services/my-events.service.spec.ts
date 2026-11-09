import { EventFilter, EventListItem } from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { EventApplicationFacts } from '@/modules/participation-request/domain/participation-request';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { MyEventsService } from './my-events.service';

const user = { id: 'u1' } as Identity;
const now = new Date('2030-01-01T12:00:00Z');
const page = { limit: 20, offset: 0 };
const filter: EventFilter = { activityIds: [] };

const anItem = (id: string): EventListItem =>
  ({ id, startAt: new Date('2030-01-02T10:00:00Z') }) as EventListItem;

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
  });

  describe('getApplications', () => {
    it('pairs each event with its status and keeps the order of the page', async () => {
      requests.getMyApplicationFacts.mockResolvedValue({
        items: [
          facts('soon', { seat: 'APPROVED', requests: ['APPROVED'] }),
          facts('cancelled', { eventStatus: 'CANCELLED' }),
          facts('late'),
        ],
        total: 45,
      });
      // The repository returns the cards in no particular order.
      events.getListItemsByIds.mockResolvedValue([
        anItem('late'),
        anItem('soon'),
        anItem('cancelled'),
      ]);

      const result = await service.getApplications(user, page, filter, now);

      expect(result.total).toBe(45);
      expect(result.nextOffset).toBe(3);
      expect(
        result.items.map(({ event, status }) => [event.id, status]),
      ).toEqual([
        ['soon', 'APPROVED'],
        ['cancelled', 'EVENT_CANCELLED'],
        ['late', 'PENDING'],
      ]);
      expect(requests.getMyApplicationFacts).toHaveBeenCalledWith(
        user,
        page,
        filter,
        now,
      );
    });

    it('counts the next offset from the rows passed, not the rows shown', async () => {
      requests.getMyApplicationFacts.mockResolvedValue({
        items: [facts('gone'), facts('last')],
        total: 22,
      });
      events.getListItemsByIds.mockResolvedValue([anItem('last')]);

      const result = await service.getApplications(
        user,
        { limit: 2, offset: 20 },
        filter,
        now,
      );

      expect(result.items).toHaveLength(1);
      expect(result.nextOffset).toBeNull();
    });

    it('leaves out events without an application worth showing', async () => {
      requests.getMyApplicationFacts.mockResolvedValue({
        items: [facts('none', { requests: [] })],
        total: 1,
      });
      events.getListItemsByIds.mockResolvedValue([anItem('none')]);

      const result = await service.getApplications(user, page, filter, now);

      expect(result.items).toEqual([]);
    });
  });

  describe('getHosted', () => {
    it('returns the page of events the user organizes', async () => {
      const hosted = { items: [anItem('mine')], total: 1 };
      events.getOrganizedEvents.mockResolvedValue(hosted);

      await expect(service.getHosted(user, page, filter, now)).resolves.toBe(
        hosted,
      );
      expect(events.getOrganizedEvents).toHaveBeenCalledWith(
        user,
        page,
        filter,
        now,
      );
    });

    it('passes the filter on as it came', async () => {
      const narrowed: EventFilter = {
        activityIds: ['a1'],
        search: 'florbal',
        location: 'Praha',
        dateFrom: '2030-01-01',
        dateTo: '2030-01-31',
      };
      events.getOrganizedEvents.mockResolvedValue({ items: [], total: 0 });

      await service.getHosted(user, page, narrowed, now);

      expect(events.getOrganizedEvents).toHaveBeenCalledWith(
        user,
        page,
        narrowed,
        now,
      );
    });
  });

  // The same rule between fields as the public list (#177).
  describe('a date range that ends before it starts', () => {
    const reversed: EventFilter = {
      activityIds: [],
      dateFrom: '2030-02-01',
      dateTo: '2030-01-01',
    };

    it('is refused for the applications', async () => {
      await expect(
        service.getApplications(user, page, reversed, now),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(requests.getMyApplicationFacts).not.toHaveBeenCalled();
    });

    it('is refused for the hosted events', async () => {
      await expect(
        service.getHosted(user, page, reversed, now),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(events.getOrganizedEvents).not.toHaveBeenCalled();
    });
  });
});
