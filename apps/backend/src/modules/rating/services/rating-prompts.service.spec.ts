import { NotificationsService } from '@/modules/notification/services/notifications.service';
import { RatingPromptCandidate } from '@/modules/rating/domain/rating-prompt';
import { RatingPromptRepository } from '@/modules/rating/repositories/rating-prompt.repository';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { mock, MockProxy } from 'jest-mock-extended';
import { RatingPromptsService } from './rating-prompts.service';

const endAt = new Date('2026-11-10T20:00:00Z');
const threeHoursLater = new Date('2026-11-10T23:00:00Z');

const anEvent = (
  overrides: Partial<RatingPromptCandidate> = {},
): RatingPromptCandidate => ({
  id: 'e1',
  endAt,
  organizerId: 'org',
  coOrganizerIds: [],
  seats: [
    { userId: 'p1', status: 'APPROVED' },
    { userId: 'p2', status: 'NO_SHOW' },
  ],
  sent: [],
  ratedOrganizer: [],
  ratedByOrganizer: [],
  ...overrides,
});

const setup = (
  candidates: RatingPromptCandidate[],
  { claimed = true, blocked = [] as string[] } = {},
): {
  repository: MockProxy<RatingPromptRepository>;
  notifications: MockProxy<NotificationsService>;
  service: RatingPromptsService;
} => {
  const repository = mock<RatingPromptRepository>();
  repository.findCandidates.mockResolvedValue(candidates);
  repository.claim.mockResolvedValue(claimed);
  const notifications = mock<NotificationsService>();
  const blocks = mock<UserBlockVisibility>();
  blocks.hiddenFrom.mockResolvedValue(blocked);
  return {
    repository,
    notifications,
    service: new RatingPromptsService(repository, notifications, blocks),
  };
};

describe('RatingPromptsService', () => {
  it('claims the due call, then sends it with the deadline', async () => {
    const { repository, notifications, service } = setup([anEvent()]);

    await service.tick(threeHoursLater);

    expect(repository.claim).toHaveBeenCalledWith('e1', 'FIRST');
    expect(notifications.notifyRatingPrompt).toHaveBeenCalledWith({
      event: { id: 'e1' },
      prompt: 'FIRST',
      deadline: new Date('2026-11-17T20:00:00Z'),
      organizerId: 'org',
      participantIds: ['p1', 'p2'],
    });
  });

  it('sends nothing the claim did not win', async () => {
    const { notifications, service } = setup([anEvent()], { claimed: false });

    await service.tick(threeHoursLater);

    expect(notifications.notifyRatingPrompt).not.toHaveBeenCalled();
  });

  it('claims nothing that is not due', async () => {
    const { repository, notifications, service } = setup([
      anEvent({ sent: ['FIRST'] }),
    ]);

    await service.tick(threeHoursLater);

    expect(repository.claim).not.toHaveBeenCalled();
    expect(notifications.notifyRatingPrompt).not.toHaveBeenCalled();
  });

  it('leaves out participants blocked from the organizer', async () => {
    const { notifications, service } = setup([anEvent()], { blocked: ['p2'] });

    await service.tick(threeHoursLater);

    expect(notifications.notifyRatingPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ participantIds: ['p1'] }),
    );
  });

  it('never throws; the next pass tries again', async () => {
    const { repository, service } = setup([]);
    repository.findCandidates.mockRejectedValue(new Error('db down'));

    await expect(service.tick(threeHoursLater)).resolves.toBeUndefined();
  });
});
