import { BadRequestException } from '@nestjs/common';
import { reportsValidationPipe } from '@/modules/report/controllers/reports-validation.pipe';
import { CreateReportDto } from './create-report.dto';
import { ReportResponseDto } from './report.response.dto';

const validate = (body: Record<string, unknown>): Promise<CreateReportDto> =>
  reportsValidationPipe.transform(body, {
    type: 'body',
    metatype: CreateReportDto,
  }) as Promise<CreateReportDto>;

const TEXT = 'Po akci mi opakovaně psal, i když jsem chtěla, ať přestane.';
const valid = {
  targetType: 'USER',
  targetId: 'u2',
  reasonId: 'reason1',
  text: TEXT,
};

// #240, ADR-0023.
describe('CreateReportDto', () => {
  it.each(['EVENT', 'USER'])(
    'takes a report of type %s',
    async (targetType) => {
      const dto = await validate({ ...valid, targetType });

      expect(dto.targetType).toBe(targetType);
    },
  );

  it('trims the text', async () => {
    const dto = await validate({ ...valid, text: `   ${TEXT}  ` });

    expect(dto.text).toBe(TEXT);
  });

  it.each([
    ['no target type', { ...valid, targetType: undefined }],
    ['a group as the target', { ...valid, targetType: 'GROUP' }],
    ['no target', { ...valid, targetId: '' }],
    ['no reason', { ...valid, reasonId: undefined }],
    ['no text', { ...valid, text: undefined }],
    ['a blank text', { ...valid, text: '            ' }],
    ['a text under 10 characters', { ...valid, text: 'Obtěžuje' }],
    ['a text over 500 characters', { ...valid, text: 'x'.repeat(501) }],
    ['a reporter in the body', { ...valid, reporterId: 'u9' }],
  ])('refuses %s', async (_case, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('takes 500 characters, counted as the database counts them', async () => {
    const dto = await validate({ ...valid, text: '😀'.repeat(500) });

    expect([...dto.text]).toHaveLength(500);
  });
});

// Visibility matrix, "Nahlášení": the reporter learns only that the report
// arrived, nothing of the queue.
describe('ReportResponseDto', () => {
  it('carries only the id and the time of the report', () => {
    const dto = ReportResponseDto.fromDomain({
      id: 'r1',
      createdAt: new Date('2030-01-01T12:00:00Z'),
    });

    expect(Object.keys(dto).sort()).toEqual(['createdAt', 'id']);
  });
});
