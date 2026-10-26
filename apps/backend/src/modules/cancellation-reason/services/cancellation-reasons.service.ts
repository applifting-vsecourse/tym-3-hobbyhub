import { CancellationReason } from '@/modules/cancellation-reason/domain/cancellation-reason';
import { CancellationReasonRepository } from '@/modules/cancellation-reason/repositories/cancellation-reason.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CancellationReasonsService {
  constructor(
    private readonly cancellationReasonRepository: CancellationReasonRepository,
  ) {}

  getCancellationReasons(): Promise<CancellationReason[]> {
    return this.cancellationReasonRepository.getAll();
  }

  isAvailable(id: string): Promise<boolean> {
    return this.cancellationReasonRepository.exists(id);
  }
}
