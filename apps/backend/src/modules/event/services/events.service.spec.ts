import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { CancellationReasonsService } from '@/modules/cancellation-reason/services/cancellation-reasons.service';
import {
  CreateEventData,
  Event,
  EventDetail,
  EventFacts,
  EventSeatFacts,
  GROUP_EVENTS_PAGE_SIZE,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { GroupsService } from '@/modules/group/services/groups.service';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { EventsService } from './events.service';

const inAnHour = (): Date => new Date(Date.now() + 3600 * 1000);

const anEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'e1',
  title: 'Čtvrteční florbal',
  description: 'Rekreační hra pro mírně pokročilé.',
  equipment: null,
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  venueType: 'PUBLIC_VENUE',
  approvalMode: 'MANUAL',
  startAt: inAnHour(),
  endAt: new Date(inAnHour().getTime() + 3600 * 1000),
  publishedAt: new Date(),
  createdAt: new Date(),
  minParticipants: 8,
  maxParticipants: 12,
  contributionAmount: 80,
  contributionNote: null,
  contact: null,
  externalChatUrl: null,
  location: {
    street: 'Chabařovická 4',
    city: 'Praha 8',
    postalCode: '18200',
    country: 'Česko',
    placeName: 'ZŠ Kobylisy',
    latitude: 50.1297,
    longitude: 14.4421,
  },
  activity: {
    id: 'a1',
    name: 'Florbal',
    icon: 'florbal',
    defaultMinParticipants: 8,
    defaultMaxParticipants: 12,
  },
  organizerId: 'u1',
  cancellationReason: null,
  cancellationNote: null,
  externalOccupiedSpots: 4,
  approvedCount: 0,
  occupiedSpots: 4,
  missingToMinimum: 4,
  freeSpots: 8,
  fillState: 'BELOW_MINIMUM',
  ...overrides,
});

const input = (): CreateEventData => ({
  title: 'Čtvrteční florbal',
  activityId: 'a1',
  description: 'Rekreační hra pro mírně pokročilé.',
  venueType: 'PUBLIC_VENUE',
  approvalMode: 'AUTOMATIC',
  startAt: inAnHour(),
  endAt: new Date(inAnHour().getTime() + 3600 * 1000),
  location: {
    street: 'Chabařovická 4',
    city: 'Praha 8',
    postalCode: '18200',
    country: 'Česko',
  },
  minParticipants: 8,
  maxParticipants: 12,
  externalOccupiedSpots: 4,
});

describe('EventsService', () => {
  const setup = (
    isActivityAvailable = true,
    isReasonAvailable = true,
  ): {
    repository: MockProxy<EventRepository>;
    notifications: MockProxy<NotificationsService>;
    groups: MockProxy<GroupsService>;
    service: EventsService;
  } => {
    const repository = mock<EventRepository>();
    repository.getEventAudience.mockResolvedValue({
      participantIds: [],
      applicantIds: [],
    });
    const activities = mock<ActivitiesService>();
    activities.isAvailable.mockResolvedValue(isActivityAvailable);
    const reasons = mock<CancellationReasonsService>();
    reasons.isAvailable.mockResolvedValue(isReasonAvailable);
    const notifications = mock<NotificationsService>();
    const groups = mock<GroupsService>();
    groups.getMemberRole.mockResolvedValue(null);
    return {
      repository,
      notifications,
      groups,
      service: new EventsService(
        repository,
        activities,
        reasons,
        notifications,
        groups,
      ),
    };
  };

  it('refuses to publish for an unverified e-mail and saves nothing', async () => {
    const { repository, service } = setup();

    const error = await service
      .createEvent({ id: 'u1', emailVerified: false } as Identity, input())
      .then(
        () => null,
        (caught: unknown) => caught,
      );

    expect(error).toBeInstanceOf(BadRequestException);
    expect(
      (error as BadRequestException).getResponse() as { violations: unknown },
    ).toMatchObject({ violations: ['EMAIL_NOT_VERIFIED'] });
    expect(repository.createPublishedEvent).not.toHaveBeenCalled();
  });

  it('publishes the event with the signed-in user as organizer', async () => {
    const { repository, service } = setup();
    const created = anEvent();
    repository.createPublishedEvent.mockResolvedValue(created);
    const data = input();

    await expect(
      service.createEvent({ id: 'u1', emailVerified: true } as Identity, data),
    ).resolves.toEqual(created);
    expect(repository.createPublishedEvent).toHaveBeenCalledWith({
      ...data,
      organizerId: 'u1',
      publishedAt: expect.any(Date),
    });
  });

  it.each([
    ['a start in the past', { startAt: new Date(Date.now() - 1000) }],
    ['an end before the start', { endAt: new Date(Date.now() + 1000) }],
    ['a minimum above the maximum', { minParticipants: 13 }],
    ['more occupied seats than the maximum', { externalOccupiedSpots: 13 }],
    [
      'a latitude without a longitude',
      { location: { ...input().location, latitude: 50.1 } },
    ],
    [
      'a longitude without a latitude',
      { location: { ...input().location, longitude: 14.4 } },
    ],
  ])('refuses %s', async (_, override) => {
    const { repository, service } = setup();

    await expect(
      service.createEvent({ id: 'u1', emailVerified: true } as Identity, {
        ...input(),
        ...override,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createPublishedEvent).not.toHaveBeenCalled();
  });

  it('refuses an activity that does not exist or is retired', async () => {
    const { repository, service } = setup(false);

    await expect(
      service.createEvent(
        { id: 'u1', emailVerified: true } as Identity,
        input(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createPublishedEvent).not.toHaveBeenCalled();
  });

  it('passes the page and the activity filter to the list', async () => {
    const { repository, service } = setup();
    const now = new Date();
    repository.getUpcomingPublicEvents.mockResolvedValue({
      items: [],
      total: 0,
    });

    await service.getUpcomingPublicEvents(
      { limit: 20, offset: 0 },
      { activityIds: ['a1'] },
      now,
    );

    expect(repository.getUpcomingPublicEvents).toHaveBeenCalledWith(
      now,
      { limit: 20, offset: 0 },
      { activityIds: ['a1'] },
    );
  });

  it('refuses a date range that ends before it starts', async () => {
    const { repository, service } = setup();

    await expect(
      service.getUpcomingPublicEvents(
        { limit: 20, offset: 0 },
        { activityIds: [], dateFrom: '2026-11-16', dateTo: '2026-11-15' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.getUpcomingPublicEvents).not.toHaveBeenCalled();
  });

  it('reports a missing event as not found', async () => {
    const { repository, service } = setup();
    repository.getEventById.mockResolvedValue(null);

    await expect(service.getEvent('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports an event that does not exist, or cannot be shown, as not found', async () => {
    const { repository, service } = setup();
    repository.getShowableEventById.mockResolvedValue(null);

    await expect(service.getEventDetail('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('a group-only event (F-07.2)', () => {
    const groupOnly = { visibility: 'GROUP_ONLY' } as EventDetail;
    const groupFacts: EventFacts = {
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'GROUP_ONLY',
      groupId: 'g1',
      startAt: inAnHour(),
      endAt: inAnHour(),
      approvalMode: 'MANUAL',
      organizerIds: ['organizer'],
      freeSpots: 3,
    };
    const viewer = { id: 'u2' } as Identity;

    it('shows a public event to a visitor without asking the group', async () => {
      const { repository, groups, service } = setup();
      const event = { visibility: 'PUBLIC' } as EventDetail;
      repository.getShowableEventById.mockResolvedValue(event);

      await expect(service.getEventDetail('e1')).resolves.toBe(event);
      expect(groups.getMemberRole).not.toHaveBeenCalled();
    });

    it('shows it to a member of the group', async () => {
      const { repository, groups, service } = setup();
      repository.getShowableEventById.mockResolvedValue(groupOnly);
      repository.getEventFacts.mockResolvedValue(groupFacts);
      repository.isInvolvedIn.mockResolvedValue(false);
      groups.getMemberRole.mockResolvedValue('MEMBER');

      await expect(service.getEventDetail('e1', viewer)).resolves.toBe(
        groupOnly,
      );
      expect(groups.getMemberRole).toHaveBeenCalledWith('g1', 'u2');
    });

    it('shows it to someone who left the group but holds a seat', async () => {
      const { repository, service } = setup();
      repository.getShowableEventById.mockResolvedValue(groupOnly);
      repository.getEventFacts.mockResolvedValue(groupFacts);
      repository.isInvolvedIn.mockResolvedValue(true);

      await expect(service.getEventDetail('e1', viewer)).resolves.toBe(
        groupOnly,
      );
      expect(repository.isInvolvedIn).toHaveBeenCalledWith('e1', 'u2');
    });

    it('shows it to its organizer', async () => {
      const { repository, service } = setup();
      repository.getShowableEventById.mockResolvedValue(groupOnly);
      repository.getEventFacts.mockResolvedValue(groupFacts);

      await expect(
        service.getEventDetail('e1', { id: 'organizer' } as Identity),
      ).resolves.toBe(groupOnly);
    });

    it.each([
      ['a visitor', undefined],
      ['someone outside the group', viewer],
    ])('hides it from %s as not found', async (_name, who) => {
      const { repository, service } = setup();
      repository.getShowableEventById.mockResolvedValue(groupOnly);
      repository.getEventFacts.mockResolvedValue(groupFacts);
      repository.isInvolvedIn.mockResolvedValue(false);

      await expect(service.getEventDetail('e1', who)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('gives its seat facts to a member only', async () => {
      const { repository, groups, service } = setup();
      const seatFacts = { ...groupFacts, hasSeat: false };
      repository.getShowableEventSeatFacts.mockResolvedValue(seatFacts);
      repository.isInvolvedIn.mockResolvedValue(false);

      await expect(
        service.getVisibleEventSeatFacts('e1', 'u2'),
      ).resolves.toBeNull();

      groups.getMemberRole.mockResolvedValue('MEMBER');
      await expect(service.getVisibleEventSeatFacts('e1', 'u2')).resolves.toBe(
        seatFacts,
      );
    });
  });

  describe('getGroupEvents (F-07.2)', () => {
    const page = { items: [], total: 0 };
    const now = new Date('2030-01-01T12:00:00Z');

    it('gives a member the group-only events too', async () => {
      const { repository, groups, service } = setup();
      groups.getMemberRole.mockResolvedValue('MEMBER');
      repository.getGroupEvents.mockResolvedValue(page);

      await expect(
        service.getGroupEvents('g1', { id: 'u1' } as Identity, 'past', 10, now),
      ).resolves.toBe(page);
      expect(repository.getGroupEvents).toHaveBeenCalledWith(
        'g1',
        { period: 'past', visibilities: ['PUBLIC', 'GROUP_ONLY'], now },
        { limit: GROUP_EVENTS_PAGE_SIZE, offset: 10 },
      );
      expect(groups.getPublicGroup).not.toHaveBeenCalled();
    });

    it('gives anyone else the upcoming public events of a public group', async () => {
      const { repository, groups, service } = setup();
      repository.getGroupEvents.mockResolvedValue(page);

      await service.getGroupEvents('g1', undefined, 'upcoming', 0, now);

      expect(groups.getPublicGroup).toHaveBeenCalledWith('g1');
      expect(repository.getGroupEvents).toHaveBeenCalledWith(
        'g1',
        { period: 'upcoming', visibilities: ['PUBLIC'], now },
        { limit: GROUP_EVENTS_PAGE_SIZE, offset: 0 },
      );
    });

    it('answers not found to a non-member asking for the past', async () => {
      const { repository, service } = setup();

      await expect(
        service.getGroupEvents('g1', { id: 'u1' } as Identity, 'past', 0, now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getGroupEvents).not.toHaveBeenCalled();
    });

    it('answers not found for a group without a public page', async () => {
      const { repository, groups, service } = setup();
      groups.getPublicGroup.mockRejectedValue(new NotFoundException());

      await expect(
        service.getGroupEvents('g1', undefined, 'upcoming', 0, now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getGroupEvents).not.toHaveBeenCalled();
    });
  });

  describe('updateEvent', () => {
    const organizer = { id: 'u1' } as Identity;

    it('saves the changes of the organizer', async () => {
      const { repository, service } = setup();
      const event = anEvent();
      repository.getEventById.mockResolvedValue(event);
      repository.updateEvent.mockResolvedValue({ ok: true, event });
      const data = input();

      await expect(service.updateEvent(organizer, 'e1', data)).resolves.toEqual(
        event,
      );
      expect(repository.updateEvent).toHaveBeenCalledWith(
        'e1',
        data,
        expect.any(Date),
      );
    });

    it('refuses someone who is not the organizer', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent({ id: 'u2' } as Identity, 'e1', input()),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    // F-09.3, ADR-0015: the approved participants hear about a moved time or
    // place; the people waiting for a decision do not, they have no seat yet.
    it('tells the approved participants when the time or the place moved', async () => {
      const { repository, notifications, service } = setup();
      const event = anEvent();
      const moved = anEvent({
        startAt: new Date(event.startAt.getTime() + 3600 * 1000),
      });
      repository.getEventById.mockResolvedValue(event);
      repository.updateEvent.mockResolvedValue({ ok: true, event: moved });
      repository.getEventAudience.mockResolvedValue({
        participantIds: ['p1', 'p2'],
        applicantIds: ['a1'],
      });

      await service.updateEvent(organizer, 'e1', input());

      expect(notifications.notifyEventChanged).toHaveBeenCalledWith({
        event: moved,
        changes: ['TIME'],
        participantIds: ['p1', 'p2'],
        changedBy: organizer,
      });
    });

    it('tells nobody about an edit that kept the time and the place', async () => {
      const { repository, notifications, service } = setup();
      const event = anEvent();
      repository.getEventById.mockResolvedValue(event);
      // From the same object: `anEvent()` reads the clock, and two reads a
      // millisecond apart would look like a moved start.
      repository.updateEvent.mockResolvedValue({
        ok: true,
        event: { ...event, title: 'Páteční florbal' },
      });

      await service.updateEvent(organizer, 'e1', input());

      expect(notifications.notifyEventChanged).not.toHaveBeenCalled();
      expect(repository.getEventAudience).not.toHaveBeenCalled();
    });

    it('reports a missing event as not found', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(null);

      await expect(
        service.updateEvent(organizer, 'nope', input()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses an event that has started', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ startAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', input()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('refuses a cancelled event', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ status: 'CANCELLED' }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', input()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a capacity below the occupied seats', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ approvedCount: 6, occupiedSpots: 10 }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          minParticipants: 2,
          maxParticipants: 9,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('applies the rules of a new event to the change', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          startAt: new Date(Date.now() - 1000),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('edits an online event without an address', async () => {
      const { repository, service } = setup();
      const event = anEvent({ venueType: 'ONLINE', location: null });
      repository.getEventById.mockResolvedValue(event);
      repository.updateEvent.mockResolvedValue({ ok: true, event });

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          venueType: 'ONLINE',
          location: undefined,
        }),
      ).resolves.toEqual(event);
    });

    it('refuses an address sent as null for an event at a place', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          location: null as unknown as undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('refuses an address for an online event', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ venueType: 'ONLINE', location: null }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          venueType: 'ONLINE',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('refuses turning an online event into a place', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(
        anEvent({ venueType: 'ONLINE', location: null }),
      );

      await expect(
        service.updateEvent(organizer, 'e1', input()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateEvent).not.toHaveBeenCalled();
    });

    it('refuses an event at a place without an address', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          location: undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reports a change that stopped being allowed during the write', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());
      repository.updateEvent.mockResolvedValue({
        ok: false,
        violation: 'MAX_BELOW_OCCUPIED',
      });

      await expect(
        service.updateEvent(organizer, 'e1', input()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a new activity that is retired', async () => {
      const { repository, service } = setup(false);
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.updateEvent(organizer, 'e1', {
          ...input(),
          activityId: 'a2',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cancelEvent', () => {
    const organizer = { id: 'u1' } as Identity;
    const data = {
      cancellationReasonId: 'r1',
      cancellationNote: 'Zavřená hala',
    };

    it('cancels a published event of the organizer', async () => {
      const { repository, service } = setup();
      const cancelled = anEvent({ status: 'CANCELLED' });
      repository.getEventById.mockResolvedValue(anEvent());
      repository.cancelEvent.mockResolvedValue({ ok: true, event: cancelled });

      await expect(service.cancelEvent(organizer, 'e1', data)).resolves.toEqual(
        cancelled,
      );
      expect(repository.cancelEvent).toHaveBeenCalledWith(
        'e1',
        data,
        expect.any(Date),
      );
    });

    // F-09.3, ADR-0015: both the people with a seat and the ones still waiting.
    it('tells the participants and the waiting applicants', async () => {
      const { repository, notifications, service } = setup();
      const cancelled = anEvent({ status: 'CANCELLED' });
      repository.getEventById.mockResolvedValue(anEvent());
      repository.cancelEvent.mockResolvedValue({ ok: true, event: cancelled });
      repository.getEventAudience.mockResolvedValue({
        participantIds: ['p1'],
        applicantIds: ['a1'],
      });

      await service.cancelEvent(organizer, 'e1', data);

      expect(notifications.notifyEventCancelled).toHaveBeenCalledWith({
        event: cancelled,
        participantIds: ['p1'],
        applicantIds: ['a1'],
        cancelledBy: organizer,
      });
    });

    it('refuses someone who is not the organizer', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.cancelEvent({ id: 'u2' } as Identity, 'e1', data),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.cancelEvent).not.toHaveBeenCalled();
    });

    it.each([
      ['has started', { startAt: new Date(Date.now() - 1000) }],
      ['is already cancelled', { status: 'CANCELLED' as const }],
      ['is a draft', { status: 'DRAFT' as const }],
    ])('refuses an event that %s', async (_, override) => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent(override));

      await expect(
        service.cancelEvent(organizer, 'e1', data),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.cancelEvent).not.toHaveBeenCalled();
    });

    it('reports a cancel that lost the race to another one', async () => {
      const { repository, service } = setup();
      repository.getEventById.mockResolvedValue(anEvent());
      repository.cancelEvent.mockResolvedValue({
        ok: false,
        violation: 'EVENT_NOT_CANCELLABLE',
      });

      await expect(
        service.cancelEvent(organizer, 'e1', data),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a reason that does not exist', async () => {
      const { repository, service } = setup(true, false);
      repository.getEventById.mockResolvedValue(anEvent());

      await expect(
        service.cancelEvent(organizer, 'e1', data),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.cancelEvent).not.toHaveBeenCalled();
    });
  });

  describe('getOrganizedEvent', () => {
    const facts: EventFacts = {
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      groupId: null,
      startAt: inAnHour(),
      endAt: new Date(inAnHour().getTime() + 3600 * 1000),
      approvalMode: 'MANUAL',
      organizerIds: ['organizer', 'co-organizer'],
      freeSpots: 3,
    };

    it.each(['organizer', 'co-organizer'])(
      'gives the event to its %s',
      async (id) => {
        const { repository, service } = setup();
        repository.getEventFacts.mockResolvedValue(facts);

        await expect(
          service.getOrganizedEvent('e1', { id } as Identity),
        ).resolves.toEqual(facts);
        expect(repository.getEventFacts).toHaveBeenCalledWith('e1');
      },
    );

    // 404, not 403: a stranger must not learn the event is there.
    it('answers 404 to someone who does not organize it', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);

      await expect(
        service.getOrganizedEvent('e1', { id: 'stranger' } as Identity),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers 404 for an event that does not exist', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(null);

      await expect(
        service.getOrganizedEvent('e1', { id: 'organizer' } as Identity),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getParticipantInfo', () => {
    const facts = (
      overrides: Partial<EventSeatFacts> = {},
    ): EventSeatFacts => ({
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      groupId: null,
      startAt: inAnHour(),
      endAt: inAnHour(),
      approvalMode: 'MANUAL',
      organizerIds: ['u1'],
      freeSpots: 3,
      hasSeat: false,
      ...overrides,
    });
    const info = {
      venueType: 'PUBLIC_VENUE' as const,
      location: null,
      organizerName: 'Jana',
      externalChatUrl: 'https://chat.whatsapp.com/abc',
      contact: '+420 777 123 456',
    };

    it('gives the contacts to a person holding a seat', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(
        facts({ hasSeat: true }),
      );
      repository.getParticipantInfo.mockResolvedValue(info);

      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).resolves.toBe(info);
    });

    it('gives them to the organizer without a seat', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(facts());
      repository.getParticipantInfo.mockResolvedValue(info);

      await expect(
        service.getParticipantInfo({ id: 'u1' } as Identity, 'e1'),
      ).resolves.toBe(info);
    });

    it('refuses anyone else and never reads the contacts', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(facts());

      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.getParticipantInfo).not.toHaveBeenCalled();
    });

    it('keeps the contacts of a cancelled or finished event to itself', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(
        facts({ hasSeat: true, status: 'CANCELLED' }),
      );
      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      repository.getShowableEventSeatFacts.mockResolvedValue(
        facts({ hasSeat: true, endAt: new Date(Date.now() - 1000) }),
      );
      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.getParticipantInfo).not.toHaveBeenCalled();
    });

    it('says not found for an event that is not public', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue(null);

      await expect(
        service.getParticipantInfo({ id: 'u2' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getManagedEvent', () => {
    const facts = (organizerIds: string[]): EventFacts => ({
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      groupId: null,
      startAt: inAnHour(),
      endAt: new Date(inAnHour().getTime() + 3600 * 1000),
      approvalMode: 'MANUAL',
      organizerIds,
      freeSpots: 8,
    });

    it('gives a co-organizer the whole event', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts(['u1', 'co']));
      const event = anEvent();
      repository.getEventById.mockResolvedValue(event);

      await expect(
        service.getManagedEvent({ id: 'co' } as Identity, 'e1'),
      ).resolves.toEqual(event);
    });

    it('answers 404 to someone who does not organize it', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts(['u1']));

      await expect(
        service.getManagedEvent({ id: 'stranger' } as Identity, 'e1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getEventById).not.toHaveBeenCalled();
    });
  });

  describe('updateExternalOccupiedSpots', () => {
    const organizer = { id: 'u1' } as Identity;
    const facts: EventFacts = {
      id: 'e1',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      groupId: null,
      startAt: inAnHour(),
      endAt: new Date(inAnHour().getTime() + 3600 * 1000),
      approvalMode: 'MANUAL',
      organizerIds: ['u1'],
      freeSpots: 2,
    };
    const violationsOf = async (
      promise: Promise<unknown>,
    ): Promise<string[]> => {
      const error = await promise.catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(BadRequestException);
      return (
        (error as BadRequestException).getResponse() as {
          violations: string[];
        }
      ).violations;
    };

    it('saves the new number and notifies nobody', async () => {
      const { repository, notifications, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);
      repository.getEventById.mockResolvedValue(
        anEvent({ approvedCount: 6, externalOccupiedSpots: 4 }),
      );
      const saved = anEvent({ approvedCount: 6, externalOccupiedSpots: 6 });
      repository.updateExternalOccupiedSpots.mockResolvedValue({
        ok: true,
        event: saved,
      });

      await expect(
        service.updateExternalOccupiedSpots(organizer, 'e1', 6),
      ).resolves.toBe(saved);
      expect(repository.updateExternalOccupiedSpots).toHaveBeenCalledWith(
        'e1',
        6,
        expect.any(Date),
      );
      expect(notifications.notifyEventChanged).not.toHaveBeenCalled();
    });

    it('refuses more than the maximum leaves and saves nothing', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);
      repository.getEventById.mockResolvedValue(
        anEvent({ approvedCount: 6, externalOccupiedSpots: 4 }),
      );

      await expect(
        violationsOf(service.updateExternalOccupiedSpots(organizer, 'e1', 7)),
      ).resolves.toEqual(['MAX_BELOW_OCCUPIED']);
      expect(repository.updateExternalOccupiedSpots).not.toHaveBeenCalled();
    });

    it('refuses an event that has started', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);
      repository.getEventById.mockResolvedValue(
        anEvent({ startAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        violationsOf(service.updateExternalOccupiedSpots(organizer, 'e1', 1)),
      ).resolves.toEqual(['EVENT_NOT_CHANGEABLE']);
    });

    // A seat approved between the read and the write.
    it('reports what the guarded write refused', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);
      repository.getEventById.mockResolvedValue(anEvent());
      repository.updateExternalOccupiedSpots.mockResolvedValue({
        ok: false,
        violation: 'MAX_BELOW_OCCUPIED',
      });

      await expect(
        violationsOf(service.updateExternalOccupiedSpots(organizer, 'e1', 8)),
      ).resolves.toEqual(['MAX_BELOW_OCCUPIED']);
    });

    it('answers 404 to someone who does not organize it', async () => {
      const { repository, service } = setup();
      repository.getEventFacts.mockResolvedValue(facts);

      await expect(
        service.updateExternalOccupiedSpots(
          { id: 'stranger' } as Identity,
          'e1',
          1,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateExternalOccupiedSpots).not.toHaveBeenCalled();
    });
  });
});
