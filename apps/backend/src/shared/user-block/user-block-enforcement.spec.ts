import { ActivitiesService } from '@/modules/activity/services/activities.service';
import { CancellationReasonsService } from '@/modules/cancellation-reason/services/cancellation-reasons.service';
import {
  EventDetail,
  EventFacts,
  EventSeatFacts,
} from '@/modules/event/domain/event';
import { EventRepository } from '@/modules/event/repositories/event.repository';
import { EventsService } from '@/modules/event/services/events.service';
import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { Group } from '@/modules/group/domain/group';
import { GroupRepository } from '@/modules/group/repositories/group.repository';
import { GroupsService } from '@/modules/group/services/groups.service';
import { NotificationRepository } from '@/modules/notification/repositories/notification.repository';
import { NotificationEmailsService } from '@/modules/notification/services/notification-emails.service';
import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { ProfileService } from '@/modules/profile/services/profile.service';
import { Identity } from '@/shared/auth/domain/identity';
import { NotFoundException } from '@nestjs/common';
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
