import { profileValidationPipe } from '@/modules/profile/controllers/profile-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import {
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
    ['a nickname under 3 characters', { name: 'ab' }],
    ['a nickname over 30 characters', { name: 'x'.repeat(31) }],
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

  // #227: the switches come in the same request, alone or with the details.
  it.each([
    [{ friendsSeeEventHistory: false, friendsSeeUpcomingEvents: true }],
    [
      {
        gender: 'FEMALE',
        birthYear: 1990,
        friendsSeeEventHistory: true,
        friendsSeeUpcomingEvents: false,
      },
    ],
  ])('accepts the switches %j', async (body) => {
    await expect(
      validate(UpdatePrivateDetailsDto, body),
    ).resolves.toMatchObject(body);
  });

  it.each([
    [{ gender: 'OTHER', birthYear: 1990 }],
    [{ gender: 'MALE', birthYear: '1990' }],
    [{ gender: 'MALE', birthYear: 1990.5 }],
    [{ gender: 'MALE', birthYear: 1899 }],
    [{ gender: 'MALE', birthDate: '1990-05-17' }],
    // Half of a pair.
    [{ gender: 'MALE' }],
    [{ birthYear: 1990 }],
    [{ friendsSeeEventHistory: true }],
    [{ friendsSeeUpcomingEvents: false }],
    [{ gender: 'MALE', birthYear: 1990, friendsSeeEventHistory: true }],
    // The switches are booleans.
    [{ friendsSeeEventHistory: 'true', friendsSeeUpcomingEvents: false }],
    [{ friendsSeeEventHistory: true, friendsSeeUpcomingEvents: 1 }],
    [{ friendsSeeEventHistory: null, friendsSeeUpcomingEvents: false }],
  ])('refuses %j', async (body) => {
    await expect(
      validate(UpdatePrivateDetailsDto, body),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
