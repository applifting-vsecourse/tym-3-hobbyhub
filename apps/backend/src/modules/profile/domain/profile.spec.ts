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
    expect(privateDetailsViolations('FEMALE', 1990, today)).toEqual([]);
  });

  it('accepts the year of turning 18 and refuses the one after', () => {
    expect(privateDetailsViolations('MALE', 2008, today)).toEqual([]);
    expect(privateDetailsViolations('MALE', 2009, today)).toEqual(['UNDERAGE']);
  });

  it.each([[1899], [2027], ['1990'], ['1990-05-17'], [1990.5]])(
    'refuses the birth year %p',
    (birthYear) => {
      expect(privateDetailsViolations('MALE', birthYear, today)).toEqual([
        'INVALID_BIRTH_YEAR',
      ]);
    },
  );

  it('refuses an unknown gender', () => {
    expect(privateDetailsViolations('OTHER', 1990, today)).toEqual([
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
