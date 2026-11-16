import { adminValidationPipe } from '@/shared/admin-auth/admin-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { AdminReportListQuery } from './admin-report-list.query';
import { AssignReportDto } from './assign-report.dto';
import { ResolveReportDto } from './resolve-report.dto';

const validateAs =
  <T>(metatype: new () => T, type: 'body' | 'query') =>
  (value: Record<string, unknown>): Promise<T> =>
    adminValidationPipe.transform(value, { type, metatype }) as Promise<T>;

// #240, #73, ADR-0023: what the queue's endpoints take.

describe('AdminReportListQuery', () => {
  const validate = validateAs(AdminReportListQuery, 'query');

  it('shows the open reports from the start by default', async () => {
    const query = await validate({});

    expect(query).toMatchObject({ status: 'OPEN', offset: 0 });
    expect(query.mine).toBeUndefined();
    expect(query.targetType).toBeUndefined();
  });

  it('takes every filter', async () => {
    await expect(
      validate({
        status: 'RESOLVED',
        targetType: 'EVENT',
        mine: 'true',
        offset: '20',
      }),
    ).resolves.toMatchObject({
      status: 'RESOLVED',
      targetType: 'EVENT',
      mine: true,
      offset: 20,
    });
  });

  it.each([
    ['an unknown status', { status: 'CLOSED' }],
    ['an unknown target type', { targetType: 'GROUP' }],
    ['mine that is not a boolean', { mine: 'yes' }],
    ['a negative offset', { offset: '-1' }],
    ['an unknown parameter', { q: 'Petr' }],
  ])('refuses %s', async (_case, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AssignReportDto', () => {
  const validate = validateAs(AssignReportDto, 'body');

  it('takes nobody, to take the report over', async () => {
    await expect(validate({})).resolves.toEqual({});
  });

  it('takes a colleague to hand it to', async () => {
    await expect(validate({ administratorId: 'a2' })).resolves.toEqual({
      administratorId: 'a2',
    });
  });

  it.each([
    ['an empty colleague', { administratorId: '' }],
    ['an unknown field', { status: 'RESOLVED' }],
  ])('refuses %s', async (_case, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ResolveReportDto', () => {
  const validate = validateAs(ResolveReportDto, 'body');

  it('takes a note and trims it', async () => {
    await expect(
      validate({ note: '  Dvojice zablokována.  ' }),
    ).resolves.toEqual({ note: 'Dvojice zablokována.' });
  });

  it.each([
    ['no note', {}],
    ['a blank note', { note: '            ' }],
    ['a note under 10 characters', { note: 'Hotovo' }],
    ['a note over 500 characters', { note: 'x'.repeat(501) }],
  ])('refuses %s', async (_case, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
