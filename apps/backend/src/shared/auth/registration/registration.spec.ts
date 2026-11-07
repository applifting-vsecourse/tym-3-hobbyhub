import {
  ageInYear,
  birthYearViolation,
  consentsAtSignUp,
  parseBirthYear,
  TERMS_VERSION,
  validateRegistration,
  yearIn,
} from './registration';

const TODAY = new Date('2026-10-16T09:30:00Z');
const THIS_YEAR = 2026;

const aBody = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  gender: 'FEMALE',
  birthYear: 1995,
  termsAccepted: true,
  adulthoodConfirmed: true,
  ...overrides,
});

describe('parseBirthYear', () => {
  it('reads a whole number', () => {
    expect(parseBirthYear(1995)).toBe(1995);
  });

  it.each([
    ['a string', '1995'],
    ['a fraction', 1995.5],
    ['a full date', '1995-04-12'],
    ['a Date', new Date('1995-04-12T00:00:00Z')],
    ['nothing', undefined],
  ])('rejects %s', (_, value) => {
    expect(parseBirthYear(value)).toBeNull();
  });
});

describe('ageInYear', () => {
  it('is the age reached during the year', () => {
    expect(ageInYear(2008, 2026)).toBe(18);
  });
});

describe('yearIn', () => {
  it('is the year in Prague, which reaches the new year before UTC', () => {
    expect(yearIn(new Date('2026-12-31T23:30:00Z'))).toBe(2027);
  });
});

describe('birthYearViolation', () => {
  it('lets through the year in which someone turns 18 at the latest', () => {
    expect(birthYearViolation(THIS_YEAR - 18, TODAY)).toBeNull();
  });

  it('refuses a year in which nobody can be 18 yet', () => {
    expect(birthYearViolation(THIS_YEAR - 17, TODAY)).toBe('UNDERAGE');
  });

  it.each([1899, THIS_YEAR + 1, '1995', null])('refuses %p', (value) => {
    expect(birthYearViolation(value, TODAY)).toBe('INVALID_BIRTH_YEAR');
  });

  it('accepts 1900 as the oldest year', () => {
    expect(birthYearViolation(1900, TODAY)).toBeNull();
  });
});

describe('validateRegistration', () => {
  it('accepts an adult who agreed to the terms and confirmed being 18+', () => {
    expect(validateRegistration(aBody(), TODAY)).toEqual({
      ok: true,
      gender: 'FEMALE',
      birthYear: 1995,
    });
  });

  it('accepts someone who turns 18 this year', () => {
    expect(
      validateRegistration(aBody({ birthYear: THIS_YEAR - 18 }), TODAY),
    ).toMatchObject({ ok: true });
  });

  it.each([
    ['no gender', { gender: undefined }, 'INVALID_GENDER'],
    ['an unknown gender', { gender: 'OTHER' }, 'INVALID_GENDER'],
    ['no birth year', { birthYear: undefined }, 'INVALID_BIRTH_YEAR'],
    [
      'a full birth date',
      { birthDate: '1995-04-12', birthYear: undefined },
      'INVALID_BIRTH_YEAR',
    ],
    ['a future birth year', { birthYear: THIS_YEAR + 1 }, 'INVALID_BIRTH_YEAR'],
    ['a birth year before 1900', { birthYear: 1899 }, 'INVALID_BIRTH_YEAR'],
    ['someone 18 only next year', { birthYear: THIS_YEAR - 17 }, 'UNDERAGE'],
    ['no consent', { termsAccepted: undefined }, 'TERMS_NOT_ACCEPTED'],
    ['consent as a string', { termsAccepted: 'true' }, 'TERMS_NOT_ACCEPTED'],
    [
      'no confirmation of adulthood',
      { adulthoodConfirmed: undefined },
      'ADULTHOOD_NOT_CONFIRMED',
    ],
    [
      'a refused confirmation of adulthood',
      { adulthoodConfirmed: false },
      'ADULTHOOD_NOT_CONFIRMED',
    ],
  ])('rejects %s', (_, overrides, code) => {
    expect(validateRegistration(aBody(overrides), TODAY)).toEqual({
      ok: false,
      code,
    });
  });
});

describe('consentsAtSignUp', () => {
  it('records the terms and the confirmation of adulthood at the same moment', () => {
    expect(consentsAtSignUp(TODAY)).toEqual({
      termsAcceptedAt: TODAY,
      termsVersion: TERMS_VERSION,
      adulthoodConfirmedAt: TODAY,
    });
  });
});
