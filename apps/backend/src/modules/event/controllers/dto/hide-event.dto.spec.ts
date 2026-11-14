import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { HideEventDto } from './hide-event.dto';

const validate = (body: Record<string, unknown>): Promise<HideEventDto> =>
  adminValidationPipe.transform(body, {
    type: 'body',
    metatype: HideEventDto,
  }) as Promise<HideEventDto>;

describe('HideEventDto', () => {
  it('takes a reason and trims it', async () => {
    const dto = await validate({ reason: '  Nabízí placené služby.  ' });

    expect(dto.reason).toBe('Nabízí placené služby.');
  });

  it.each([
    ['no reason', {}],
    ['a blank reason', { reason: '          ' }],
    ['a reason under 10 characters', { reason: 'Spam' }],
    ['a reason over 500 characters', { reason: 'x'.repeat(501) }],
    ['a reason that is not text', { reason: 42 }],
    ['an unknown field', { reason: 'Nabízí placené služby.', hidden: true }],
  ])('refuses %s', async (_case, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('takes 500 characters, counted as the database counts them', async () => {
    const dto = await validate({ reason: '😀'.repeat(500) });

    expect([...dto.reason]).toHaveLength(500);
  });
});
