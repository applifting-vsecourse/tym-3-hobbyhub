import { onboardingValidationPipe } from '@/modules/onboarding/controllers/onboarding-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import {
  SaveActivitiesDto,
  SaveLocationDto,
  SaveProfileDto,
} from './save-onboarding.dto';

// What the endpoint does with a request body before the handler sees it.
const validate = <T>(
  metatype: new () => T,
  body: Record<string, unknown>,
): Promise<T> =>
  onboardingValidationPipe.transform(body, {
    type: 'body',
    metatype,
  }) as Promise<T>;

describe('SaveActivitiesDto', () => {
  it.each([
    ['no level', { activityId: 'a1' }],
    ['a null level', { activityId: 'a1', levelId: null }],
  ])('accepts %s, the level is optional', async (_name, item) => {
    await expect(
      validate(SaveActivitiesDto, { items: [item] }),
    ).resolves.toBeDefined();
  });

  it('accepts activities with a level', async () => {
    await expect(
      validate(SaveActivitiesDto, {
        items: [{ activityId: 'a1', levelId: 'l3' }],
      }),
    ).resolves.toBeDefined();
  });

  it.each([
    ['an empty level id', { items: [{ activityId: 'a1', levelId: '' }] }],
    [
      'a level that is not a text',
      { items: [{ activityId: 'a1', levelId: 3 }] },
    ],
    ['an empty activity id', { items: [{ activityId: '', levelId: 'l1' }] }],
    ['no list', {}],
  ])('refuses %s', async (_name, body) => {
    await expect(validate(SaveActivitiesDto, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('SaveLocationDto', () => {
  const valid = { city: 'Praha 8', travelRadiusKm: 25 };

  it('trims the text and drops a blank street', async () => {
    await expect(
      validate(SaveLocationDto, { ...valid, city: ' Praha 8 ', street: '  ' }),
    ).resolves.toEqual({ ...valid, street: undefined });
  });

  it.each([5, 100])('accepts a range of %i km', async (travelRadiusKm) => {
    await expect(
      validate(SaveLocationDto, { ...valid, travelRadiusKm }),
    ).resolves.toBeDefined();
  });

  it.each([4, 101, 25.5, '25'])(
    'refuses a range of %s km',
    async (travelRadiusKm) => {
      await expect(
        validate(SaveLocationDto, { ...valid, travelRadiusKm }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('asks for the city', async () => {
    await expect(
      validate(SaveLocationDto, { ...valid, city: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SaveProfileDto', () => {
  it('accepts a bio of up to 300 characters', async () => {
    await expect(
      validate(SaveProfileDto, { bio: 'a'.repeat(300) }),
    ).resolves.toBeDefined();
  });

  it('refuses a longer bio', async () => {
    await expect(
      validate(SaveProfileDto, { bio: 'a'.repeat(301) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('treats a blank bio as not filled in', async () => {
    await expect(validate(SaveProfileDto, { bio: '   ' })).resolves.toEqual({
      bio: undefined,
    });
  });

  it('refuses fields the server decides', async () => {
    await expect(
      validate(SaveProfileDto, { bio: 'x', onboardingStepsDone: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
