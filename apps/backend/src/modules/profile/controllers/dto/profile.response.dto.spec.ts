import { Profile, PublicProfile } from '@/modules/profile/domain/profile';
import {
  ProfileResponseDto,
  PublicProfileResponseDto,
} from './profile.response.dto';

describe('PublicProfileResponseDto', () => {
  it('carries only what another person may see', () => {
    // Even a row with private columns spread into the domain object must not
    // reach the response.
    const profile = {
      id: 'u2',
      name: 'Petr',
      nickname: 'petr',
      relation: 'none',
      bio: null,
      image: null,
      cover: null,
      interests: [],
      gender: 'MALE',
      birthYear: 1990,
      address: { city: 'Praha' },
      phone: '123',
      // #227: the switches are the owner's own business.
      friendVisibility: {
        friendsSeeEventHistory: true,
        friendsSeeUpcomingEvents: false,
      },
      friendsSeeEventHistory: true,
      friendsSeeUpcomingEvents: false,
    } as unknown as PublicProfile;
    const response = PublicProfileResponseDto.fromDomain(profile);
    expect(response).not.toHaveProperty('email');
    expect(Object.keys(response).sort()).toEqual([
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
});

describe('ProfileResponseDto', () => {
  it('gives the owner what friends may see of their events', () => {
    const profile: Profile = {
      name: 'Jana',
      joinedAt: new Date('2026-09-01T10:00:00Z'),
      bio: null,
      image: null,
      cover: null,
      gender: 'FEMALE',
      birthYear: 1990,
      interests: [],
      address: null,
      travelRadiusKm: null,
      friendVisibility: {
        friendsSeeEventHistory: false,
        friendsSeeUpcomingEvents: true,
      },
    };
    expect(ProfileResponseDto.fromDomain(profile)).toMatchObject({
      friendsSeeEventHistory: false,
      friendsSeeUpcomingEvents: true,
    });
  });
});
