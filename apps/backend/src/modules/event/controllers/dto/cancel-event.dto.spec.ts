import { eventsValidationPipe } from '@/modules/event/controllers/events-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { CancelEventDto } from './cancel-event.dto';

const validate = (body: Record<string, unknown>): Promise<CancelEventDto> =>
  eventsValidationPipe.transform(body, {
    type: 'body',
    metatype: CancelEventDto,
  }) as Promise<CancelEventDto>;

describe('CancelEventDto', () => {
  it('takes a reason without a note', async () => {
    const dto = await validate({ cancellationReasonId: 'r1' });

    expect(dto.cancellationReasonId).toBe('r1');
    expect(dto.cancellationNote).toBeUndefined();
  });

  it('trims the note and drops a blank one', async () => {
    const trimmed = await validate({
      cancellationReasonId: 'r1',
      cancellationNote: '  Hala je zavřená ',
    });
    const blank = await validate({
      cancellationReasonId: 'r1',
      cancellationNote: '   ',
    });

    expect(trimmed.cancellationNote).toBe('Hala je zavřená');
    expect(blank.cancellationNote).toBeUndefined();
  });

  it('takes a note of 500 characters and refuses 501', async () => {
    await expect(
      validate({
        cancellationReasonId: 'r1',
        cancellationNote: 'x'.repeat(500),
      }),
    ).resolves.toBeDefined();
    await expect(
      validate({
        cancellationReasonId: 'r1',
        cancellationNote: 'x'.repeat(501),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([[{}], [{ cancellationReasonId: '' }]])(
    'refuses a missing reason %j',
    async (body) => {
      await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
