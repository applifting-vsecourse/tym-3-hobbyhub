import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { CancellationReasonsService } from '@/modules/cancellation-reason/services/cancellation-reasons.service';
import {
  EventDetail,
  EventFacts,
  EventSeatFacts,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { EventsService } from '@/modules/event/services/events.service';
import { FriendEventsService } from '@/modules/event/services/friend-events.service';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { Group } from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { GroupsService } from '@/modules/group/services/groups.service';
import { MembershipRequestRepository } from '@/modules/membership-request/repositories/membership-request.repository';
import { MembershipRequestsService } from '@/modules/membership-request/services/membership-requests.service';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { NotificationEmailsService } from '@/modules/notification/services/notification-emails.service';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
import { ParticipationRequestRepository } from '@/modules/participation-request/repositories/participation-request.repository';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { ProfileService } from '@/modules/profile/services/profile.service';
import { RatingsService } from '@/modules/rating/services/ratings.service';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { UserBlockVisibility } from './user-block-visibility';

// #239, ADR-0022: someone blocked from the viewer does not exist for them,
// in every place that shows people or what they made. Each test blocks
// "blocked" from "viewer" and checks that the place answers as if the
// content were not there.

const viewer = new Identity('viewer', 'v@example.com', 'Viewer', true);

const blockedFromViewer = (): MockProxy<UserBlockVisibility> => {
  const blocks = mock<UserBlockVisibility>();
  blocks.hiddenFor.mockImplementation((id) =>
    Promise.resolve(id === 'viewer' ? ['blocked'] : []),
  );
  blocks.hiddenFrom.mockImplementation((id) =>
    Promise.resolve(id === 'blocked' ? ['viewer'] : []),
  );
  blocks.mutedFor.mockImplementation((id) =>
    Promise.resolve(id === 'viewer' ? ['blocked'] : []),
  );
  blocks.notHearingFrom.mockImplementation((id) =>
    Promise.resolve(id === 'blocked' ? ['viewer'] : []),
  );
  blocks.blockedBy.mockResolvedValue([]);
  return blocks;
};

describe('blocks between two people (#239)', () => {
  describe('events', () => {
    const setup = (): {
      repository: MockProxy<EventRepository>;
      service: EventsService;
    } => {
      const repository = mock<EventRepository>();
      return {
        repository,
        service: new EventsService(
          repository,
          mock<ActivitiesService>(),
          mock<CancellationReasonsService>(),
          mock<NotificationsService>(),
          mock<GroupsService>(),
          blockedFromViewer(),
        ),
      };
    };

    const facts = (organizerIds: string[]): EventFacts =>
      ({
        id: 'e1',
        visibility: 'PUBLIC',
        organizerIds,
        isHidden: false,
      }) as EventFacts;

    it.each([
      ['organizes', ['blocked']],
      ['co-organizes', ['someone', 'blocked']],
    ])(
      'gives no detail of an event the blocked person %s',
      async (_case, organizerIds) => {
        const { repository, service } = setup();
        repository.getShowableEventById.mockResolvedValue({
          id: 'e1',
          visibility: 'PUBLIC',
        } as EventDetail);
        repository.getEventFacts.mockResolvedValue(facts(organizerIds));

        await expect(
          service.getEventDetail('e1', viewer),
        ).rejects.toBeInstanceOf(NotFoundException);
        // A visitor and anyone else still see it.
        await expect(service.getEventDetail('e1')).resolves.toBeDefined();
      },
    );

    it('lets the viewer neither ask to join nor hold a seat there', async () => {
      const { repository, service } = setup();
      repository.getShowableEventSeatFacts.mockResolvedValue({
        ...facts(['blocked']),
        hasSeat: false,
      } as EventSeatFacts);

      await expect(
        service.getVisibleEventSeatFacts('e1', 'viewer'),
      ).resolves.toBeNull();
    });

    it('leaves the events of the blocked person out of the list', async () => {
      const { repository, service } = setup();

      await service.getUpcomingPublicEvents(
        { limit: 20, offset: 0 },
        { activityIds: [] },
        new Date(),
        viewer,
      );

      expect(repository.getUpcomingPublicEvents).toHaveBeenCalledWith(
        expect.any(Date),
        { limit: 20, offset: 0 },
        { activityIds: [], hiddenOrganizerIds: ['blocked'] },
      );
    });
  });

  describe('profiles', () => {
    it('gives no profile of the blocked person', async () => {
      const repository = mock<ProfileRepository>();
      const service = new ProfileService(
        repository,
        mock<OnboardingService>(),
        mock<FriendshipService>(),
        blockedFromViewer(),
        mock<RatingsService>(),
        mock<FriendEventsService>(),
      );

      await expect(
        service.getPublicProfile('blocked', viewer),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getPublicRow).not.toHaveBeenCalled();
    });
  });

  describe('groups', () => {
    const setup = (): {
      repository: MockProxy<GroupRepository>;
      service: GroupsService;
    } => {
      const repository = mock<GroupRepository>();
      repository.getGroupById.mockResolvedValue({
        id: 'g1',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      } as Group);
      repository.listAdminIds.mockResolvedValue(['blocked']);
      repository.getMemberRole.mockResolvedValue('MEMBER');
      return {
        repository,
        service: new GroupsService(
          repository,
          mock<ActivitiesService>(),
          mock<FriendshipService>(),
          blockedFromViewer(),
        ),
      };
    };

    it('gives no page of a group the blocked person runs, as owner or admin', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockResolvedValue(null);
      repository.listAdminIds.mockResolvedValue(['owner', 'blocked']);

      await expect(service.getPublicGroup('g1', viewer)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.getPublicGroup('g1')).resolves.toBeDefined();
    });

    it('still shows a member their own group, where both of the pair run it', async () => {
      const { repository, service } = setup();
      repository.getMemberRole.mockResolvedValue('ADMIN');

      await expect(service.getPublicGroup('g1', viewer)).resolves.toBeDefined();
    });

    it('leaves the blocked person off the member list', async () => {
      const { repository, service } = setup();
      repository.listMembers.mockResolvedValue([]);

      await service.listMembers('g1', viewer);

      expect(repository.listMembers).toHaveBeenCalledWith('g1', ['blocked']);
    });
  });

  describe('notifications', () => {
    it('tells nobody about what someone blocked from them did', async () => {
      const repository = mock<NotificationRepository>();
      repository.createForRecipients.mockResolvedValue(['n1']);
      const service = new NotificationsService(
        repository,
        mock<NotificationEmailsService>(),
        blockedFromViewer(),
      );

      await service.notifyNewParticipationRequest({
        event: { id: 'e1', organizerIds: ['viewer', 'co-organizer'] },
        applicant: { id: 'blocked' },
      });

      expect(repository.createForRecipients).toHaveBeenCalledWith(
        expect.objectContaining({ recipientIds: ['co-organizer'] }),
      );
    });

    it('leaves what the blocked person did out of the bell', async () => {
      const repository = mock<NotificationRepository>();
      const service = new NotificationsService(
        repository,
        mock<NotificationEmailsService>(),
        blockedFromViewer(),
      );

      await service.countUnread(viewer);

      expect(repository.countUnread).toHaveBeenCalledWith('viewer', [
        'blocked',
      ]);
    });
  });
});

// #65, ADR-0031: "viewer" blocked "blocked" themselves. The blocked one
// still exists for the viewer, but the viewer sends them no requests.
describe('a block by a user (#65)', () => {
  const viewerBlocked = (): MockProxy<UserBlockVisibility> => {
    const blocks = mock<UserBlockVisibility>();
    blocks.hiddenFor.mockResolvedValue([]);
    blocks.hiddenFrom.mockResolvedValue([]);
    blocks.blockedBy.mockImplementation((id) =>
      Promise.resolve(id === 'viewer' ? ['blocked'] : []),
    );
    return blocks;
  };

  const violationsOf = async (promise: Promise<unknown>): Promise<unknown> => {
    const error = await promise.then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(BadRequestException);
    return (
      (error as BadRequestException).getResponse() as { violations: unknown }
    ).violations;
  };

  it('lets the blocker ask to join no event the blocked one organizes', async () => {
    const repository = mock<ParticipationRequestRepository>();
    const events = mock<EventsService>();
    events.getVisibleEventSeatFacts.mockResolvedValue({
      id: 'e1',
      status: 'PUBLISHED',
      startAt: new Date('2030-01-02T10:00:00Z'),
      endAt: new Date('2030-01-02T12:00:00Z'),
      organizerIds: ['someone', 'blocked'],
      freeSpots: 3,
      isHidden: false,
      hasSeat: false,
    } as EventSeatFacts);
    repository.getRequestsOf.mockResolvedValue([]);
    const notifications = mock<NotificationsService>();
    const service = new ParticipationRequestsService(
      repository,
      events,
      notifications,
      viewerBlocked(),
    );

    await expect(
      violationsOf(
        service.requestToJoin(
          viewer,
          'e1',
          undefined,
          new Date('2030-01-01T10:00:00Z'),
        ),
      ),
    ).resolves.toEqual(['BLOCKED_ORGANIZER']);
    expect(repository.createPending).not.toHaveBeenCalled();
    expect(notifications.notifyNewParticipationRequest).not.toHaveBeenCalled();
  });

  it('lets the blocker ask to join no group the blocked one runs', async () => {
    const repository = mock<MembershipRequestRepository>();
    const groups = mock<GroupsService>();
    groups.getPublicGroup.mockResolvedValue({ id: 'g1' } as Group);
    groups.getMemberRole.mockResolvedValue(null);
    groups.getAdminIds.mockResolvedValue(['owner', 'blocked']);
    repository.getRequestsOf.mockResolvedValue([]);
    const service = new MembershipRequestsService(
      repository,
      groups,
      mock<NotificationsService>(),
      viewerBlocked(),
    );

    await expect(
      violationsOf(service.requestMembership(viewer, 'g1')),
    ).resolves.toEqual(['BLOCKED_ADMIN']);
    expect(repository.createPending).not.toHaveBeenCalled();
  });

  // ADR-0028: an open group is joined without a request; the block still
  // keeps the blocker out of a group the blocked one runs.
  it('lets the blocker join no open group the blocked one runs', async () => {
    const repository = mock<MembershipRequestRepository>();
    const groups = mock<GroupsService>();
    groups.assertPublicGroup.mockResolvedValue({
      id: 'g1',
      approvalMode: 'OPEN',
    } as Group);
    groups.getMemberRole.mockResolvedValue(null);
    groups.getAdminIds.mockResolvedValue(['owner', 'blocked']);
    repository.getRequestsOf.mockResolvedValue([]);
    const service = new MembershipRequestsService(
      repository,
      groups,
      mock<NotificationsService>(),
      viewerBlocked(),
    );

    await expect(
      violationsOf(service.joinOpenGroup(viewer, 'g1')),
    ).resolves.toEqual(['BLOCKED_ADMIN']);
    expect(groups.addMember).not.toHaveBeenCalled();
  });
});
