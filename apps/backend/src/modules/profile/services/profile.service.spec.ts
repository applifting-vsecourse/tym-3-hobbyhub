import { Onboarding } from '@/modules/onboarding/domain/onboarding';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
import { PROFILE_IMAGE_PREFIX } from '@/modules/profile/domain/profile';
import {
  ProfileRepository,
  ProfileRow,
} from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { ProfileService } from './profile.service';

const user = new Identity('u1', 'jana@example.com', 'Jana', true);

const aRow = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  name: 'Jana',
  createdAt: new Date('2026-09-01T10:00:00Z'),
  bio: null,
  image: null,
  profileCover: null,
  gender: 'FEMALE',
  birthYear: 1990,
  ...overrides,
});

const anOnboarding = (overrides: Partial<Onboarding> = {}): Onboarding => ({
  stepsDone: 0,
  skipped: false,
  completedAt: null,
  interests: [],
  address: null,
  travelRadiusKm: null,
  bio: null,
  image: null,
  ...overrides,
});

describe('ProfileService', () => {
  const setup = (
    row: ProfileRow | null = aRow(),
    onboarding: Onboarding = anOnboarding(),
  ): {
    repository: MockProxy<ProfileRepository>;
    onboardingService: MockProxy<OnboardingService>;
    service: ProfileService;
  } => {
    const repository = mock<ProfileRepository>();
    repository.getRow.mockResolvedValue(row);
    const onboardingService = mock<OnboardingService>();
    onboardingService.getOnboarding.mockResolvedValue(onboarding);
    return {
      repository,
      onboardingService,
      service: new ProfileService(repository, onboardingService),
    };
  };

  it('puts the account and the onboarding answers together', async () => {
    const { service } = setup(aRow({ bio: 'Hraju rok' }));
    await expect(service.getProfile(user)).resolves.toMatchObject({
      name: 'Jana',
      bio: 'Hraju rok',
      gender: 'FEMALE',
      birthYear: 1990,
      interests: [],
      address: null,
    });
  });

  it('is not found for an unknown user', async () => {
    const { service } = setup(null);
    await expect(service.getProfile(user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('updatePublic', () => {
    it('saves a WebP photo', async () => {
      const { service, repository } = setup();
      const image = PROFILE_IMAGE_PREFIX + 'AAAA';
      await service.updatePublic(user, { image });
      expect(repository.updatePublic).toHaveBeenCalledWith('u1', { image });
    });

    it('refuses a photo that is not WebP and saves nothing', async () => {
      const { service, repository } = setup();
      await expect(
        service.updatePublic(user, { image: 'data:image/png;base64,AAAA' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updatePublic).not.toHaveBeenCalled();
    });

    it('saves the cover as profileCover', async () => {
      const { service, repository } = setup();
      await service.updatePublic(user, { cover: 'florbal' });
      expect(repository.updatePublic).toHaveBeenCalledWith('u1', {
        profileCover: 'florbal',
      });
    });

    it('refuses a malformed cover and saves nothing', async () => {
      const { service, repository } = setup();
      await expect(
        service.updatePublic(user, { cover: 'Not A Cover' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updatePublic).not.toHaveBeenCalled();
    });

    it('resets the cover to the default with null', async () => {
      const { service, repository } = setup();
      await service.updatePublic(user, { cover: null });
      expect(repository.updatePublic).toHaveBeenCalledWith('u1', {
        profileCover: null,
      });
    });

    it('removes the photo with null', async () => {
      const { service, repository } = setup();
      await service.updatePublic(user, { image: null });
      expect(repository.updatePublic).toHaveBeenCalledWith('u1', {
        image: null,
      });
    });
  });

  describe('updatePrivate', () => {
    const now = new Date('2026-11-03T10:00:00Z');

    it('corrects the gender and the year of birth', async () => {
      const { service, repository } = setup();
      await service.updatePrivate(
        user,
        { gender: 'MALE', birthYear: 1985 },
        now,
      );
      expect(repository.updatePrivate).toHaveBeenCalledWith('u1', {
        gender: 'MALE',
        birthYear: 1985,
      });
    });

    it('refuses someone under 18', async () => {
      const { service, repository } = setup();
      await expect(
        service.updatePrivate(user, { gender: 'MALE', birthYear: 2009 }, now),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updatePrivate).not.toHaveBeenCalled();
    });
  });

  describe('updateLocation', () => {
    const address = {
      street: 'Sokolovská 12',
      city: 'Praha 8',
      postalCode: '186 00',
      country: 'Česko',
      latitude: 50.0942,
      longitude: 14.4421,
    };

    it('keeps the travel radius the user has', async () => {
      const { service, onboardingService } = setup(
        aRow(),
        anOnboarding({ travelRadiusKm: 40 }),
      );
      await service.updateLocation(user, address);
      expect(onboardingService.replaceLocation).toHaveBeenCalledWith(user, {
        address,
        travelRadiusKm: 40,
      });
    });

    it('takes the default radius for a first address', async () => {
      const { service, onboardingService } = setup();
      await service.updateLocation(user, address);
      expect(onboardingService.replaceLocation).toHaveBeenCalledWith(user, {
        address,
        travelRadiusKm: 25,
      });
    });
  });

  describe('removeLocation', () => {
    it('clears the whole location and answers with the profile without it', async () => {
      const { service, repository, onboardingService } = setup(
        aRow(),
        anOnboarding(),
      );
      const profile = await service.removeLocation(user);
      expect(repository.clearLocation).toHaveBeenCalledWith('u1');
      expect(onboardingService.replaceLocation).not.toHaveBeenCalled();
      expect(profile.address).toBeNull();
      expect(profile.travelRadiusKm).toBeNull();
    });

    it('clears before it reads, so the answer is what is stored', async () => {
      const { service, repository } = setup();
      const order: string[] = [];
      repository.clearLocation.mockImplementation(() => {
        order.push('clear');
        return Promise.resolve();
      });
      repository.getRow.mockImplementation(() => {
        order.push('read');
        return Promise.resolve(aRow());
      });
      await service.removeLocation(user);
      expect(order).toEqual(['clear', 'read']);
    });
  });

  describe('getPublicProfile', () => {
    const publicRow = {
      id: 'u2',
      name: 'Petr',
      createdAt: new Date('2026-09-02T10:00:00Z'),
      bio: 'Běhám',
      image: null,
      profileCover: null,
    };

    it('carries neither e-mail, gender, birth year nor address', async () => {
      const { service, repository, onboardingService } = setup();
      repository.getPublicRow.mockResolvedValue(publicRow);
      onboardingService.getInterestsOf.mockResolvedValue([]);
      const profile = await service.getPublicProfile('u2');
      expect(Object.keys(profile).sort()).toEqual([
        'bio',
        'cover',
        'id',
        'image',
        'interests',
        'name',
      ]);
    });

    it('answers not found for a user that does not exist', async () => {
      const { service, repository } = setup();
      repository.getPublicRow.mockResolvedValue(null);
      await expect(service.getPublicProfile('nobody')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
