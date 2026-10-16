import { ageOn, parseBirthDate, validateRegistration } from './registration';

const TODAY = new Date('2026-10-16T09:30:00Z');

const aBody = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  gender: 'FEMALE',
  birthDate: '1995-04-12',
  termsAccepted: true,
  ...overrides,
});

describe('parseBirthDate', () => {
  it('reads a calendar date as midnight UTC', () => {
    expect(parseBirthDate('1995-04-12')).toEqual(
      new Date('1995-04-12T00:00:00Z'),
    );
  });

  it('reads a Date by its UTC day', () => {
    expect(parseBirthDate(new Date('1995-04-12T00:00:00Z'))).toEqual(
      new Date('1995-04-12T00:00:00Z'),
    );
  });

  it.each([
    ['an invalid Date', new Date('nope')],
    ['an impossible day', '2001-02-30'],
    ['a timestamp', '1995-04-12T00:00:00Z'],
    ['another format', '12.4.1995'],
    ['a number', 19950412],
    ['nothing', undefined],
  ])('rejects %s', (_, value) => {
    expect(parseBirthDate(value)).toBeNull();
  });
});

describe('ageOn', () => {
  it('counts the birthday itself', () => {
    expect(ageOn(new Date('2008-10-16Z'), TODAY)).toBe(18);
  });

  it('is a year less the day before the birthday', () => {
    expect(ageOn(new Date('2008-10-17Z'), TODAY)).toBe(17);
  });
});

describe('validateRegistration', () => {
  it('accepts an adult who agreed to the terms', () => {
    expect(validateRegistration(aBody(), TODAY)).toEqual({
      ok: true,
      gender: 'FEMALE',
      birthDate: new Date('1995-04-12T00:00:00Z'),
    });
  });

  it('accepts someone who turns 18 today', () => {
    expect(
      validateRegistration(aBody({ birthDate: '2008-10-16' }), TODAY),
    ).toMatchObject({ ok: true });
  });

  it.each([
    ['no gender', { gender: undefined }, 'INVALID_GENDER'],
    ['an unknown gender', { gender: 'OTHER' }, 'INVALID_GENDER'],
    ['no birth date', { birthDate: undefined }, 'INVALID_BIRTH_DATE'],
    ['a future birth date', { birthDate: '2030-01-01' }, 'INVALID_BIRTH_DATE'],
    [
      'a birth date before 1900',
      { birthDate: '1899-12-31' },
      'INVALID_BIRTH_DATE',
    ],
    ['someone 18 tomorrow', { birthDate: '2008-10-17' }, 'UNDERAGE'],
    ['no consent', { termsAccepted: undefined }, 'TERMS_NOT_ACCEPTED'],
    ['consent as a string', { termsAccepted: 'true' }, 'TERMS_NOT_ACCEPTED'],
  ])('rejects %s', (_, overrides, code) => {
    expect(validateRegistration(aBody(overrides), TODAY)).toEqual({
      ok: false,
      code,
    });
  });
});
