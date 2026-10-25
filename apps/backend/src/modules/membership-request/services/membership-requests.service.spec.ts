import { Group } from '@/modules/group/domain/group';
import { GroupsService } from '@/modules/group/services/groups.service';
import { MembershipRequest } from '@/modules/membership-request/domain/membership-request';
import { MembershipRequestRepository } from '@/modules/membership-request/repositories/membership-request.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { MembershipRequestsService } from './membership-requests.service';

const user = { id: 'u1' } as Identity;
const admin = { id: 'admin' } as Identity;
const now = new Date('2030-01-01T12:00:00Z');

const aGroup = (overrides: Partial<Group> = {}): Group => ({
  id: 'g1',
  name: 'Čtvrteční florbalisté',
  description: 'Test',
  locationName: 'Praha 8',
  usualSchedule: null,
  visibility: 'PUBLIC',
  status: 'ACTIVE',
  createdAt: now,
  activity: {
    id: 'a1',
    name: 'Florbal',
    icon: 'florbal',
    defaultMinParticipants: 6,
    defaultMaxParticipants: 12,
  },
  memberCount: 5,
  ...overrides,
});

const aRequest = (
  overrides: Partial<MembershipRequest> = {},
): MembershipRequest => ({
  id: 'r1',
  groupId: 'g1',
  userId: 'u1',
  status: 'PENDING',
  message: null,
  requestedAt: now,
  decidedAt: null,
  rejectionReason: null,
  ...overrides,
});

// The `violations` codes of a refused request.
const violationsOf = async (promise: Promise<unknown>): Promise<unknown> => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BadRequestException);
  return (
    (error as BadRequestException).getResponse() as {
      violations: unknown;
    }
  ).violations;
};

describe('MembershipRequestsService', () => {
  const setup = (
    requests: MembershipRequest[] = [],
  ): {
    repository: MockProxy<MembershipRequestRepository>;
    groups: MockProxy<GroupsService>;
    service: MembershipRequestsService;
  } => {
    const repository = mock<MembershipRequestRepository>();
    const groups = mock<GroupsService>();
    groups.getPublicGroup.mockResolvedValue(aGroup());
    groups.getManagedGroup.mockResolvedValue(aGroup());
    groups.getMemberRole.mockResolvedValue(null);
    repository.getRequestsOf.mockResolvedValue(requests);
    return {
      repository,
      groups,
      service: new MembershipRequestsService(repository, groups),
    };
  };

  describe('asking to join', () => {
    it('creates a waiting request for the signed-in user', async () => {
      const { repository, service } = setup();
      const request = aRequest({ message: 'Ahoj' });
      repository.createPending.mockResolvedValue(request);

      await expect(service.requestMembership(user, 'g1', 'Ahoj')).resolves.toBe(
        request,
      );
      expect(repository.createPending).toHaveBeenCalledWith({
        groupId: 'g1',
        userId: 'u1',
        message: 'Ahoj',
      });
    });

    it('refuses a group that is not public and active', async () => {
      const { groups, repository, service } = setup();
      groups.getPublicGroup.mockRejectedValue(new NotFoundException());

      await expect(
        service.requestMembership(user, 'g1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.createPending).not.toHaveBeenCalled();
    });

    it('refuses a member', async () => {
      const { groups, repository, service } = setup();
      groups.getMemberRole.mockResolvedValue('MEMBER');

      await expect(
        violationsOf(service.requestMembership(user, 'g1')),
      ).resolves.toEqual(['IS_MEMBER']);
      expect(repository.createPending).not.toHaveBeenCalled();
    });

    it('refuses anyone rejected before (ADR-0014)', async () => {
      const { repository, service } = setup([
        aRequest({ status: 'REJECTED', decidedAt: now }),
      ]);

      await expect(
        violationsOf(service.requestMembership(user, 'g1')),
      ).resolves.toEqual(['REJECTED_BEFORE']);
      expect(repository.createPending).not.toHaveBeenCalled();
    });

    it('reports a request sent at the same moment from another window', async () => {
      const { repository, service } = setup();
      repository.createPending.mockResolvedValue(null);

      await expect(
        violationsOf(service.requestMembership(user, 'g1')),
      ).resolves.toEqual(['ALREADY_REQUESTED']);
    });
  });

  it('tells the user their current request and whether they may ask', async () => {
    const pending = aRequest();
    const { service } = setup([pending]);

    await expect(service.getMyRequestState(user, 'g1')).resolves.toEqual({
      request: pending,
      violations: ['ALREADY_REQUESTED'],
    });
  });

  describe('withdrawing', () => {
    it('withdraws the pending request of the signed-in user', async () => {
      const { repository, service } = setup();
      repository.withdrawPending.mockResolvedValue(true);

      await service.withdrawMyRequest(user, 'g1', now);
      expect(repository.withdrawPending).toHaveBeenCalledWith('g1', 'u1', now);
    });

    it('reports nothing to withdraw as not found', async () => {
      const { repository, service } = setup();
      repository.withdrawPending.mockResolvedValue(false);

      await expect(
        service.withdrawMyRequest(user, 'g1', now),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('the admin side', () => {
    it('lists the waiting requests to an admin', async () => {
      const { groups, repository, service } = setup();
      repository.getPendingRequests.mockResolvedValue([]);

      await expect(service.getPendingRequests(admin, 'g1')).resolves.toEqual(
        [],
      );
      expect(groups.getManagedGroup).toHaveBeenCalledWith('g1', admin);
    });

    it('answers anyone who does not manage the group with not found', async () => {
      const { groups, repository, service } = setup();
      groups.getManagedGroup.mockRejectedValue(new NotFoundException());

      await expect(
        service.getPendingRequests(user, 'g1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.approveRequest(user, 'g1', 'r1', now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getPendingRequests).not.toHaveBeenCalled();
      expect(repository.approvePending).not.toHaveBeenCalled();
    });

    it('reports a request from another group as not found', async () => {
      const { repository, service } = setup();
      repository.getRequest.mockResolvedValue(null);

      await expect(
        service.approveRequest(admin, 'g1', 'r-elsewhere', now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.getRequest).toHaveBeenCalledWith('g1', 'r-elsewhere');
    });

    it('approves a waiting request', async () => {
      const { repository, service } = setup();
      const approved = aRequest({ status: 'APPROVED', decidedAt: now });
      repository.getRequest.mockResolvedValue(aRequest());
      repository.approvePending.mockResolvedValue(approved);

      await expect(
        service.approveRequest(admin, 'g1', 'r1', now),
      ).resolves.toBe(approved);
      expect(repository.approvePending).toHaveBeenCalledWith({
        groupId: 'g1',
        requestId: 'r1',
        at: now,
      });
    });

    it('refuses to decide in a cancelled group', async () => {
      const { groups, repository, service } = setup();
      groups.getManagedGroup.mockResolvedValue(aGroup({ status: 'CANCELLED' }));
      repository.getRequest.mockResolvedValue(aRequest());

      await expect(
        violationsOf(service.approveRequest(admin, 'g1', 'r1', now)),
      ).resolves.toEqual(['GROUP_CANCELLED']);
      expect(repository.approvePending).not.toHaveBeenCalled();
    });

    it('refuses a request that no longer waits', async () => {
      const { repository, service } = setup();
      repository.getRequest.mockResolvedValue(
        aRequest({ status: 'WITHDRAWN', decidedAt: now }),
      );

      await expect(
        violationsOf(service.rejectRequest(admin, 'g1', 'r1', undefined, now)),
      ).resolves.toEqual(['NOT_PENDING']);
      expect(repository.rejectPending).not.toHaveBeenCalled();
    });

    it('reports what changed between the read and the write', async () => {
      const { repository, service } = setup();
      repository.getRequest.mockResolvedValue(aRequest());
      repository.approvePending.mockResolvedValue('APPLICANT_IS_MEMBER');
      repository.rejectPending.mockResolvedValue(null);

      await expect(
        violationsOf(service.approveRequest(admin, 'g1', 'r1', now)),
      ).resolves.toEqual(['APPLICANT_IS_MEMBER']);
      await expect(
        violationsOf(service.rejectRequest(admin, 'g1', 'r1', undefined, now)),
      ).resolves.toEqual(['NOT_PENDING']);
    });

    it('rejects a waiting request with the reason', async () => {
      const { repository, service } = setup();
      const rejected = aRequest({
        status: 'REJECTED',
        decidedAt: now,
        rejectionReason: 'Plno',
      });
      repository.getRequest.mockResolvedValue(aRequest());
      repository.rejectPending.mockResolvedValue(rejected);

      await expect(
        service.rejectRequest(admin, 'g1', 'r1', 'Plno', now),
      ).resolves.toBe(rejected);
      expect(repository.rejectPending).toHaveBeenCalledWith({
        groupId: 'g1',
        requestId: 'r1',
        reason: 'Plno',
        at: now,
      });
    });
  });
});
