import { EventInterestRepository } from '@/modules/event-interest/repositories/event-interest.repository';
import { EventFilter, EventSeatFacts } from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { EventInterestsService } from './event-interests.service';

const user = { id: 'u1' } as Identity;
const now = new Date('2030-01-01T12:00:00Z');
const page = { limit: 20, offset: 0 };
const filter: EventFilter = { activityIds: [] };

const facts = (override: Partial<EventSeatFacts> = {}): EventSeatFacts => ({
  id: 'e1',
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  groupId: null,
  startAt: new Date('2030-01-02T10:00:00Z'),
  endAt: new Date('2030-01-02T12:00:00Z'),
  approvalMode: 'MANUAL',
  organizerIds: ['organizer'],
  freeSpots: 0,
  isHidden: false,
  hasSeat: false,
  ...override,
});

describe('EventInterestsService', () => {
  let repository: MockProxy<EventInterestRepository>;
  let events: MockProxy<EventsService>;
  let blocks: MockProxy<UserBlockVisibility>;
  let service: EventInterestsService;

  beforeEach(() => {
    repository = mock<EventInterestRepository>();
    events = mock<EventsService>();
    blocks = mock<UserBlockVisibility>();
    blocks.hiddenFor.mockResolvedValue([]);
    service = new EventInterestsService(repository, events, blocks);
  });

  describe('save', () => {
    it('saves a full event that has not started, as the signed-in user', async () => {
      events.getVisibleEventSeatFacts.mockResolvedValue(facts());

      await expect(service.save(user, 'e1', now)).resolves.toEqual({
        isSaved: true,
        violations: [],
      });
      expect(events.getVisibleEventSeatFacts).toHaveBeenCalledWith('e1', 'u1');
      expect(repository.save).toHaveBeenCalledWith('u1', 'e1');
    });

    // The same 404 as the detail: a group-only event of a group they are not
    // in, one hidden by an administrator, one of someone blocked from them.
    it('does not find an event the user may not see', async () => {
      events.getVisibleEventSeatFacts.mockResolvedValue(null);

      await expect(service.save(user, 'e1', now)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it.each<[Partial<EventSeatFacts>, string, string]>([
      [{ organizerIds: ['organizer', 'u1'] }, 'u1', 'IS_ORGANIZER'],
      [{ status: 'CANCELLED' }, 'u1', 'EVENT_CANCELLED'],
      [{ startAt: new Date('2030-01-01T11:00:00Z') }, 'u1', 'EVENT_STARTED'],
      [
        {
          status: 'FINISHED',
          startAt: new Date('2029-12-01T10:00:00Z'),
          endAt: new Date('2029-12-01T12:00:00Z'),
        },
        'u1',
        'EVENT_FINISHED',
      ],
    ])(
      'refuses %j with the code of the rule',
      async (override, userId, violation) => {
        events.getVisibleEventSeatFacts.mockResolvedValue(facts(override));

        const error = await service
          .save({ id: userId } as Identity, 'e1', now)
          .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getResponse()).toMatchObject({
          violations: [violation],
        });
        expect(repository.save).not.toHaveBeenCalled();
      },
    );
  });

  describe('remove', () => {
    // Always allowed: a saved event may be removed after it is over, and
    // asking about any other event tells nothing.
    it('removes without looking at the event', async () => {
      await service.remove(user, 'e1');

      expect(repository.remove).toHaveBeenCalledWith('u1', 'e1');
      expect(events.getVisibleEventSeatFacts).not.toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('says whether the event is saved and why saving is refused now', async () => {
      events.getVisibleEventSeatFacts.mockResolvedValue(
        facts({
          status: 'FINISHED',
          startAt: new Date('2029-12-01T10:00:00Z'),
          endAt: new Date('2029-12-01T12:00:00Z'),
        }),
      );
      repository.isSaved.mockResolvedValue(true);

      await expect(service.getState(user, 'e1', now)).resolves.toEqual({
        isSaved: true,
        violations: ['EVENT_FINISHED'],
      });
      expect(repository.isSaved).toHaveBeenCalledWith('u1', 'e1');
    });

    it('does not find an event the user may not see', async () => {
      events.getVisibleEventSeatFacts.mockResolvedValue(null);

      await expect(service.getState(user, 'e1', now)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.isSaved).not.toHaveBeenCalled();
    });
  });

  describe('getMyPage', () => {
    it('leaves out the events of people blocked from the user (#239)', async () => {
      blocks.hiddenFor.mockResolvedValue(['blocked']);
      repository.getPage.mockResolvedValue({ items: [], total: 0 });

      await service.getMyPage(user, page, filter, now);

      expect(blocks.hiddenFor).toHaveBeenCalledWith('u1');
      expect(repository.getPage).toHaveBeenCalledWith('u1', now, page, {
        ...filter,
        hiddenOrganizerIds: ['blocked'],
      });
    });
  });
});
