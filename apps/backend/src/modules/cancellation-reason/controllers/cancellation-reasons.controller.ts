import { CancellationReasonsService } from '@/modules/cancellation-reason/services/cancellation-reasons.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CancellationReasonResponseDto } from './dto/cancellation-reason.response.dto';

// Public lookup data, like the activities: the cancel dialog needs it.
@ApiTags('cancellation-reasons')
@Controller('cancellation-reasons')
export class CancellationReasonsController {
  constructor(
    private readonly cancellationReasonsService: CancellationReasonsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List reasons an organizer can cancel an event for',
  })
  @ApiResponse({ status: 200, type: [CancellationReasonResponseDto] })
  async list(): Promise<CancellationReasonResponseDto[]> {
    const reasons =
      await this.cancellationReasonsService.getCancellationReasons();
    return reasons.map(CancellationReasonResponseDto.fromDomain);
  }
}
