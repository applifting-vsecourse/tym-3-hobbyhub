import { Onboarding } from '@/modules/onboarding/domain/onboarding';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
import { ParticipationRequestsService } from '@/modules/participation-request/services/participation-requests.service';
import { PROFILE_IMAGE_PREFIX } from '@/modules/profile/domain/profile';
import {
  ProfileRepository,
  ProfileRow,
} from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { ProfileService } from './profile.service';

const user = new Identity('u1', 'jana@example.com', 'Jana', 'user', true);

const aRow = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  name: 'Jana',
  createdAt: new Date('2026-09-01T10:00:00Z'),
  bio: null,
  image: null,
  profileCover: null,
  gender: 'FEMALE',
  birthDate: new Date('1990-05-17T00:00:00Z'),
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
    requests: MockProxy<ParticipationRequestsService>;
    service: ProfileService;
  } => {
    const repository = mock<ProfileRepository>();
    repository.getRow.mockResolvedValue(row);
    const onboardingService = mock<OnboardingService>();
    onboardingService.getOnboarding.mockResolvedValue(onboarding);
    const requests = mock<ParticipationRequestsService>();
    return {
      repository,
      onboardingService,
      requests,
      service: new ProfileService(repository, onboardingService, requests),
    };
  };

  it('puts the account and the onboarding answers together', async () => {
    const { service } = setup(aRow({ bio: 'Hraju rok' }));
    await expect(service.getProfile(user)).resolves.toMatchObject({
      name: 'Jana',
      bio: 'Hraju rok',
      gender: 'FEMALE',
      birthDate: '1990-05-17',
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

    it('corrects the gender and the birth date', async () => {
      const { service, repository } = setup();
      await service.updatePrivate(
        user,
        { gender: 'MALE', birthDate: '1985-01-02' },
        now,
      );
      expect(repository.updatePrivate).toHaveBeenCalledWith('u1', {
        gender: 'MALE',
        birthDate: new Date('1985-01-02T00:00:00Z'),
      });
    });

    it('refuses someone under 18', async () => {
      const { service, repository } = setup();
      await expect(
        service.updatePrivate(
          user,
          { gender: 'MALE', birthDate: '2015-01-02' },
          now,
        ),
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

  describe('getPublicProfile', () => {
    const publicRow = {
      id: 'u2',
      name: 'Petr',
      email: 'petr@example.com',
      createdAt: new Date('2026-09-02T10:00:00Z'),
      bio: 'Běhám',
      image: null,
      profileCover: null,
    };

    it('never carries gender, birth date or address', async () => {
      const { service, repository, onboardingService, requests } = setup();
      repository.getPublicRow.mockResolvedValue(publicRow);
      onboardingService.getInterestsOf.mockResolvedValue([]);
      requests.isApprovedParticipantOf.mockResolvedValue(false);
      const profile = await service.getPublicProfile(user, 'u2');
      expect(Object.keys(profile).sort()).toEqual([
        'bio',
        'cover',
        'email',
        'id',
        'image',
        'interests',
        'joinedAt',
        'name',
      ]);
    });

    it('hides the e-mail from anyone who is not the organizer of an approved participant', async () => {
      const { service, repository, onboardingService, requests } = setup();
      repository.getPublicRow.mockResolvedValue(publicRow);
      onboardingService.getInterestsOf.mockResolvedValue([]);
      requests.isApprovedParticipantOf.mockResolvedValue(false);
      await expect(service.getPublicProfile(user, 'u2')).resolves.toMatchObject(
        { email: null },
      );
      expect(requests.isApprovedParticipantOf).toHaveBeenCalledWith('u1', 'u2');
    });

    it('shows the e-mail to the organizer of an event the person is approved on', async () => {
      const { service, repository, onboardingService, requests } = setup();
      repository.getPublicRow.mockResolvedValue(publicRow);
      onboardingService.getInterestsOf.mockResolvedValue([]);
      requests.isApprovedParticipantOf.mockResolvedValue(true);
      await expect(service.getPublicProfile(user, 'u2')).resolves.toMatchObject(
        { email: 'petr@example.com' },
      );
    });

    it('does not ask about approval when looking at oneself', async () => {
      const { service, repository, onboardingService, requests } = setup();
      repository.getPublicRow.mockResolvedValue({ ...publicRow, id: 'u1' });
      onboardingService.getInterestsOf.mockResolvedValue([]);
      await expect(service.getPublicProfile(user, 'u1')).resolves.toMatchObject(
        { email: null },
      );
      expect(requests.isApprovedParticipantOf).not.toHaveBeenCalled();
    });

    it('answers not found for a user that does not exist', async () => {
      const { service, repository } = setup();
      repository.getPublicRow.mockResolvedValue(null);
      await expect(service.getPublicProfile(user, 'nobody')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
