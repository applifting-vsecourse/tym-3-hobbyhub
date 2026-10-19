import { EventRepository } from '@/modules/event/repositories/event.repository';
import { NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { EventsService } from './events.service';

describe('EventsService', () => {
  it('answers 404 for an event that is not public', async () => {
    const repository = mock<EventRepository>();
    repository.getPublicEventById.mockResolvedValue(null);

    await expect(
      new EventsService(repository).getEvent('missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
