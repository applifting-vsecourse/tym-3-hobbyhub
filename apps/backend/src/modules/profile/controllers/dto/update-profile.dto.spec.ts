import { profileValidationPipe } from '@/modules/profile/controllers/profile-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import {
  UpdateFriendVisibilityDto,
  UpdatePrivateDetailsDto,
  UpdateProfileDto,
} from './update-profile.dto';

const validate = <T>(
  metatype: new () => T,
  body: Record<string, unknown>,
): Promise<T> =>
  profileValidationPipe.transform(body, {
    type: 'body',
    metatype,
  }) as Promise<T>;

describe('UpdateProfileDto', () => {
  it('accepts any part of the profile', async () => {
    await expect(validate(UpdateProfileDto, {})).resolves.toBeDefined();
    await expect(
      validate(UpdateProfileDto, { name: 'Jana', bio: 'Hraju rok' }),
    ).resolves.toBeDefined();
  });

  it('trims the nickname and clears a blank bio', async () => {
    const dto = await validate(UpdateProfileDto, { name: ' Jana ', bio: '  ' });
    expect(dto).toMatchObject({ name: 'Jana', bio: null });
  });

  it.each([
    ['a blank nickname', { name: '   ' }],
    ['a nickname over 50 characters', { name: 'x'.repeat(51) }],
    ['a bio over 300 characters', { bio: 'x'.repeat(301) }],
    ['a photo that is not text', { image: 5 }],
    ['an unknown field', { role: 'admin' }],
  ])('refuses %s', async (_name, body) => {
    await expect(validate(UpdateProfileDto, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('UpdatePrivateDetailsDto', () => {
  it('accepts a gender and a year of birth', async () => {
    await expect(
      validate(UpdatePrivateDetailsDto, {
        gender: 'MALE',
        birthYear: 1990,
      }),
    ).resolves.toBeDefined();
  });

  it.each([
    [{ gender: 'OTHER', birthYear: 1990 }],
    [{ gender: 'MALE', birthYear: '1990' }],
    [{ gender: 'MALE', birthYear: 1990.5 }],
    [{ gender: 'MALE', birthYear: 1899 }],
    [{ gender: 'MALE', birthDate: '1990-05-17' }],
    [{ gender: 'MALE' }],
  ])('refuses %j', async (body) => {
    await expect(
      validate(UpdatePrivateDetailsDto, body),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('UpdateFriendVisibilityDto', () => {
  it('accepts both switches', async () => {
    await expect(
      validate(UpdateFriendVisibilityDto, {
        friendsSeeEventHistory: false,
        friendsSeeUpcomingEvents: true,
      }),
    ).resolves.toMatchObject({
      friendsSeeEventHistory: false,
      friendsSeeUpcomingEvents: true,
    });
  });

  it.each([
    [{}],
    [{ friendsSeeEventHistory: true }],
    [{ friendsSeeUpcomingEvents: false }],
    [{ friendsSeeEventHistory: 'true', friendsSeeUpcomingEvents: false }],
    [{ friendsSeeEventHistory: true, friendsSeeUpcomingEvents: 1 }],
    [{ friendsSeeEventHistory: null, friendsSeeUpcomingEvents: false }],
  ])('refuses %j', async (body) => {
    await expect(
      validate(UpdateFriendVisibilityDto, body),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
