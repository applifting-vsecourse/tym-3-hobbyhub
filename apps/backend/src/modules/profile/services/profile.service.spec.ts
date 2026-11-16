import { FriendshipService } from '@/modules/friendship/services/friendship.service';
import { Onboarding } from '@/modules/onboarding/domain/onboarding';
import { OnboardingService } from '@/modules/onboarding/services/onboarding.service';
import { PROFILE_IMAGE_PREFIX } from '@/modules/profile/domain/profile';
import {
  ProfileRepository,
  ProfileRow,
} from '@/modules/profile/repositories/profile.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { UserBlockVisibility } from '@/shared/user-block/user-block-visibility';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { ProfileService } from './profile.service';

// #239: nobody is blocked here; blocks have tests of their own.
const noBlocks = (): MockProxy<UserBlockVisibility> => {
  const blocks = mock<UserBlockVisibility>();
  blocks.hiddenFor.mockResolvedValue([]);
  blocks.hiddenFrom.mockResolvedValue([]);
  return blocks;
};

const user = new Identity('u1', 'jana@example.com', 'Jana', true);

const aRow = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  name: 'Jana',
  createdAt: new Date('2026-09-01T10:00:00Z'),
  bio: null,
  image: null,
  profileCover: null,
  gender: 'FEMALE',
  birthYear: 1990,
  friendsSeeEventHistory: true,
  friendsSeeUpcomingEvents: false,
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
    friendshipService: MockProxy<FriendshipService>;
    service: ProfileService;
  } => {
    const repository = mock<ProfileRepository>();
    repository.getRow.mockResolvedValue(row);
    const onboardingService = mock<OnboardingService>();
    onboardingService.getOnboarding.mockResolvedValue(onboarding);
    onboardingService.getOnboardingOf.mockResolvedValue(onboarding);
    const friendshipService = mock<FriendshipService>();
    friendshipService.relationBetween.mockResolvedValue('none');
    return {
      repository,
      onboardingService,
      friendshipService,
      service: new ProfileService(
        repository,
        onboardingService,
        friendshipService,
        noBlocks(),
      ),
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

  it('reports what friends may see of the events', async () => {
    const { service } = setup(
      aRow({ friendsSeeEventHistory: false, friendsSeeUpcomingEvents: true }),
    );
    await expect(service.getProfile(user)).resolves.toMatchObject({
      friendVisibility: {
        friendsSeeEventHistory: false,
        friendsSeeUpcomingEvents: true,
      },
    });
  });

  describe('updatePrivate', () => {
    const now = new Date('2026-11-03T10:00:00Z');

    it('corrects the gender and the year of birth', async () => {
      const { service, repository } = setup();
      await service.updatePrivate(
        user,
        { details: { gender: 'MALE', birthYear: 1985 } },
        now,
      );
      expect(repository.updatePrivate).toHaveBeenCalledWith('u1', {
        gender: 'MALE',
        birthYear: 1985,
      });
    });

    // #227: the switches alone, for an account without the details too.
    it('saves both switches and returns the profile', async () => {
      const { service, repository } = setup();
      await service.updatePrivate(user, {
        friendVisibility: {
          friendsSeeEventHistory: false,
          friendsSeeUpcomingEvents: true,
        },
      });
      expect(repository.updatePrivate).toHaveBeenCalledWith('u1', {
        friendsSeeEventHistory: false,
        friendsSeeUpcomingEvents: true,
      });
      expect(repository.getRow).toHaveBeenCalledWith('u1');
    });

    // One write, so the form never saves only half of what it sent.
    it('saves the details and the switches in one write', async () => {
      const { service, repository } = setup();
      await service.updatePrivate(
        user,
        {
          details: { gender: 'FEMALE', birthYear: 1990 },
          friendVisibility: {
            friendsSeeEventHistory: true,
            friendsSeeUpcomingEvents: true,
          },
        },
        now,
      );
      expect(repository.updatePrivate).toHaveBeenCalledTimes(1);
      expect(repository.updatePrivate).toHaveBeenCalledWith('u1', {
        gender: 'FEMALE',
        birthYear: 1990,
        friendsSeeEventHistory: true,
        friendsSeeUpcomingEvents: true,
      });
    });

    it('refuses someone under 18, switches and all', async () => {
      const { service, repository } = setup();
      await expect(
        service.updatePrivate(
          user,
          {
            details: { gender: 'MALE', birthYear: 2009 },
            friendVisibility: {
              friendsSeeEventHistory: false,
              friendsSeeUpcomingEvents: false,
            },
          },
          now,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updatePrivate).not.toHaveBeenCalled();
    });

    it('writes nothing for an empty request', async () => {
      const { service, repository } = setup();
      await service.updatePrivate(user, {});
      expect(repository.updatePrivate).not.toHaveBeenCalled();
      expect(repository.getRow).toHaveBeenCalledWith('u1');
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
      nickname: 'PetrBehá',
      createdAt: new Date('2026-09-02T10:00:00Z'),
      bio: 'Běhám',
      image: null,
      profileCover: null,
    };

    it('carries neither e-mail, gender, birth year nor address', async () => {
      const { service, repository, onboardingService } = setup();
      repository.getPublicRow.mockResolvedValue(publicRow);
      onboardingService.getInterestsOf.mockResolvedValue([]);
      const profile = await service.getPublicProfile('u2', user);
      expect(Object.keys(profile).sort()).toEqual([
        'bio',
        'cover',
        'id',
        'image',
        'interests',
        'name',
        'nickname',
        'relation',
      ]);
    });

    // #225: the profile says where the signed-in viewer stands with the person.
    it.each(['none', 'request_sent', 'request_received', 'friends'] as const)(
      "carries the viewer's relation (%s) and the nickname",
      async (relation) => {
        const { service, repository, onboardingService, friendshipService } =
          setup();
        repository.getPublicRow.mockResolvedValue(publicRow);
        onboardingService.getInterestsOf.mockResolvedValue([]);
        friendshipService.relationBetween.mockResolvedValue(relation);
        await expect(
          service.getPublicProfile('u2', user),
        ).resolves.toMatchObject({ nickname: 'PetrBehá', relation });
        expect(friendshipService.relationBetween).toHaveBeenCalledWith(
          'u1',
          'u2',
        );
      },
    );

    it('answers not found for a user that does not exist', async () => {
      const { service, repository } = setup();
      repository.getPublicRow.mockResolvedValue(null);
      await expect(service.getPublicProfile('nobody', user)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // #238: the account and the private profile fields, for the administration.
  describe('getUserForAdministration', () => {
    const account = {
      id: 'u2',
      name: 'Petr',
      email: 'petr@example.com',
      emailVerified: false,
      status: 'ACTIVE' as const,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };

    it('puts the account and the whole profile together', async () => {
      const { repository, onboardingService, service } = setup();
      repository.getAccount.mockResolvedValue(account);

      const detail = await service.getUserForAdministration('u2');

      expect(detail.account).toBe(account);
      expect(detail.profile).toMatchObject({
        gender: 'FEMALE',
        birthYear: 1990,
      });
      expect(repository.getRow).toHaveBeenCalledWith('u2');
      expect(onboardingService.getOnboardingOf).toHaveBeenCalledWith('u2');
    });

    it('is not found for an unknown user', async () => {
      const { repository, service } = setup();
      repository.getAccount.mockResolvedValue(null);

      await expect(
        service.getUserForAdministration('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
