import { ReportReason } from '@/modules/report-reason/domain/report-reason';
import { ReportReasonRepository } from '@/modules/report-reason/repositories/report-reason.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportReasonsService {
  constructor(private readonly repository: ReportReasonRepository) {}

  getReportReasons(): Promise<ReportReason[]> {
    return this.repository.getAll();
  }

  isAvailable(id: string): Promise<boolean> {
    return this.repository.exists(id);
  }
}
