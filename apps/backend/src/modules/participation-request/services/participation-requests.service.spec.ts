import { EventSeatFacts } from '@/modules/event/domain/event';
import { EventsService } from '@/modules/event/services/events.service';
import { ParticipationRequest } from '@/modules/participation-request/domain/participation-request';
import { ParticipationRequestRepository } from '@/modules/participation-request/repositories/participation-request.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { ParticipationRequestsService } from './participation-requests.service';

const user = { id: 'u1' } as Identity;
const now = new Date('2030-01-01T12:00:00Z');

const anEvent = (overrides: Partial<EventSeatFacts> = {}): EventSeatFacts => ({
  id: 'e1',
  status: 'PUBLISHED',
  startAt: new Date('2030-01-01T18:00:00Z'),
  endAt: new Date('2030-01-01T20:00:00Z'),
  approvalMode: 'MANUAL',
  organizerIds: ['organizer'],
  freeSpots: 2,
  hasSeat: false,
  ...overrides,
});

const aRequest = (
  overrides: Partial<ParticipationRequest> = {},
): ParticipationRequest => ({
  id: 'r1',
  eventId: 'e1',
  userId: 'u1',
  status: 'PENDING',
  message: null,
  requestedAt: now,
  decidedAt: null,
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

describe('ParticipationRequestsService', () => {
  const setup = (
    event: EventSeatFacts | null = anEvent(),
    requests: ParticipationRequest[] = [],
  ): {
    repository: MockProxy<ParticipationRequestRepository>;
    events: MockProxy<EventsService>;
    service: ParticipationRequestsService;
  } => {
    const repository = mock<ParticipationRequestRepository>();
    const events = mock<EventsService>();
    events.getPublicEventSeatFacts.mockResolvedValue(event);
    repository.getRequestsOf.mockResolvedValue(requests);
    return {
      repository,
      events,
      service: new ParticipationRequestsService(repository, events),
    };
  };

  describe('requestToJoin', () => {
    it('creates a pending request of the signed-in user', async () => {
      const { repository, service } = setup();
      const created = aRequest({ message: 'Ahoj' });
      repository.createPending.mockResolvedValue(created);

      await expect(
        service.requestToJoin(user, 'e1', 'Ahoj', now),
      ).resolves.toEqual(created);
      expect(repository.createPending).toHaveBeenCalledWith({
        eventId: 'e1',
        userId: 'u1',
        message: 'Ahoj',
      });
    });

    it('refuses a full event and says why', async () => {
      const { repository, service } = setup(anEvent({ freeSpots: 0 }));

      await expect(
        violationsOf(service.requestToJoin(user, 'e1', undefined, now)),
      ).resolves.toEqual(['EVENT_FULL']);
      expect(repository.createPending).not.toHaveBeenCalled();
    });

    it('refuses a second pending request', async () => {
      const { repository, service } = setup(anEvent(), [aRequest()]);

      await expect(
        violationsOf(service.requestToJoin(user, 'e1', undefined, now)),
      ).resolves.toEqual(['ALREADY_REQUESTED']);
      expect(repository.createPending).not.toHaveBeenCalled();
    });

    // Two windows sending at once: both pass the read, the index stops one.
    it('refuses the request the database turned away as a duplicate', async () => {
      const { repository, service } = setup();
      repository.createPending.mockResolvedValue(null);

      await expect(
        violationsOf(service.requestToJoin(user, 'e1', undefined, now)),
      ).resolves.toEqual(['ALREADY_REQUESTED']);
    });

    it('answers 404 for an event that is not public', async () => {
      const { repository, service } = setup(null);

      await expect(
        service.requestToJoin(user, 'e1', undefined, now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.createPending).not.toHaveBeenCalled();
    });

    describe('with automatic approval', () => {
      const automatic = anEvent({ approvalMode: 'AUTOMATIC' });

      it('approves the request at once and takes the seat', async () => {
        const { repository, service } = setup(automatic);
        const approved = aRequest({ status: 'APPROVED', decidedAt: now });
        repository.createApproved.mockResolvedValue(approved);

        await expect(
          service.requestToJoin(user, 'e1', 'Ahoj', now),
        ).resolves.toEqual(approved);
        expect(repository.createApproved).toHaveBeenCalledWith({
          eventId: 'e1',
          userId: 'u1',
          message: 'Ahoj',
          at: now,
        });
        expect(repository.createPending).not.toHaveBeenCalled();
      });

      it('runs the same rules first', async () => {
        const { repository, service } = setup({ ...automatic, freeSpots: 0 });

        await expect(
          violationsOf(service.requestToJoin(user, 'e1', undefined, now)),
        ).resolves.toEqual(['EVENT_FULL']);
        expect(repository.createApproved).not.toHaveBeenCalled();
      });

      // The last seat taken by someone else, or by the same person in another
      // window, between the read and the write.
      it.each(['EVENT_FULL', 'HAS_SEAT'] as const)(
        'refuses with %s when the seat went meanwhile',
        async (violation) => {
          const { repository, service } = setup(automatic);
          repository.createApproved.mockResolvedValue(violation);

          await expect(
            violationsOf(service.requestToJoin(user, 'e1', undefined, now)),
          ).resolves.toEqual([violation]);
        },
      );
    });
  });

  describe('getMyRequestState', () => {
    it('shows the pending request and why a new one is refused', async () => {
      const pending = aRequest();
      const { service } = setup(anEvent(), [
        pending,
        aRequest({ id: 'r0', status: 'WITHDRAWN', decidedAt: now }),
      ]);

      await expect(service.getMyRequestState(user, 'e1', now)).resolves.toEqual(
        { request: pending, violations: ['ALREADY_REQUESTED'] },
      );
    });

    it('is free to ask with no request at all', async () => {
      const { service } = setup();

      await expect(service.getMyRequestState(user, 'e1', now)).resolves.toEqual(
        { request: null, violations: [] },
      );
    });
  });

  describe('withdrawMyRequest', () => {
    it('withdraws the pending request', async () => {
      const { repository, service } = setup();
      repository.withdrawPending.mockResolvedValue(true);

      await service.withdrawMyRequest(user, 'e1', now);
      expect(repository.withdrawPending).toHaveBeenCalledWith('e1', 'u1', now);
    });

    it('withdraws it even once the event is no longer public', async () => {
      const { repository, events, service } = setup(null);
      repository.withdrawPending.mockResolvedValue(true);

      await expect(
        service.withdrawMyRequest(user, 'e1', now),
      ).resolves.toBeUndefined();
      expect(events.getPublicEventSeatFacts).not.toHaveBeenCalled();
    });

    it('answers 404 when nothing is pending', async () => {
      const { repository, service } = setup();
      repository.withdrawPending.mockResolvedValue(false);

      await expect(
        service.withdrawMyRequest(user, 'e1', now),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
