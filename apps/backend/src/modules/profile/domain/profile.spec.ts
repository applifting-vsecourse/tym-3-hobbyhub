import {
  coverViolations,
  imageViolations,
  privateDetailsViolations,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_PREFIX,
} from './profile';

const imageOf = (bytes: number): string =>
  PROFILE_IMAGE_PREFIX + Buffer.alloc(bytes, 1).toString('base64');

describe('imageViolations', () => {
  it('accepts a WebP data URL within the limit', () => {
    expect(imageViolations(imageOf(1000))).toEqual([]);
    expect(imageViolations(imageOf(PROFILE_IMAGE_MAX_BYTES))).toEqual([]);
  });

  it('accepts an illustration of the app and refuses a malformed name', () => {
    expect(imageViolations('avatar:florbalista')).toEqual([]);
    expect(imageViolations('avatar:Not A Name')).toEqual(['IMAGE_FORMAT']);
    expect(imageViolations('avatar:')).toEqual(['IMAGE_FORMAT']);
  });

  it('refuses a picture over the limit', () => {
    expect(imageViolations(imageOf(PROFILE_IMAGE_MAX_BYTES + 1))).toEqual([
      'IMAGE_TOO_LARGE',
    ]);
  });

  it.each([
    ['another format', 'data:image/png;base64,AAAA'],
    ['a plain URL', 'https://example.com/a.webp'],
    ['text that is not base64', PROFILE_IMAGE_PREFIX + 'not base64!'],
    ['an empty payload', PROFILE_IMAGE_PREFIX],
  ])('refuses %s', (_name, image) => {
    expect(imageViolations(image)).toEqual(['IMAGE_FORMAT']);
  });
});

describe('privateDetailsViolations', () => {
  const today = new Date('2026-11-03T10:00:00Z');

  it('accepts a grown-up with a gender', () => {
    expect(privateDetailsViolations('FEMALE', '1990-05-17', today)).toEqual([]);
  });

  it('counts the 18th birthday', () => {
    expect(privateDetailsViolations('MALE', '2008-11-03', today)).toEqual([]);
    expect(privateDetailsViolations('MALE', '2008-11-04', today)).toEqual([
      'UNDERAGE',
    ]);
  });

  it.each([['2026-02-30'], ['17.5.1990'], ['2027-01-01'], ['1899-12-31']])(
    'refuses the birth date %s',
    (birthDate) => {
      expect(privateDetailsViolations('MALE', birthDate, today)).toEqual([
        'INVALID_BIRTH_DATE',
      ]);
    },
  );

  it('refuses an unknown gender', () => {
    expect(privateDetailsViolations('OTHER', '1990-05-17', today)).toEqual([
      'INVALID_GENDER',
    ]);
  });
});

describe('coverViolations', () => {
  it('accepts a cover of the app and the own WebP picture', () => {
    expect(coverViolations('florbal')).toEqual([]);
    expect(coverViolations(imageOf(1000))).toEqual([]);
  });

  it('refuses a malformed id, an illustration avatar and a picture over 2 MB', () => {
    expect(coverViolations('Not A Cover')).toEqual(['IMAGE_FORMAT']);
    expect(coverViolations('avatar:florbalista')).toEqual(['IMAGE_FORMAT']);
    expect(coverViolations(imageOf(PROFILE_IMAGE_MAX_BYTES + 1))).toEqual([
      'IMAGE_TOO_LARGE',
    ]);
  });
});
