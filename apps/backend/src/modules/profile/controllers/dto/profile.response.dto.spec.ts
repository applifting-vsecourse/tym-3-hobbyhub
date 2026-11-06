import { PublicProfile } from '@/modules/profile/domain/profile';
import { PublicProfileResponseDto } from './profile.response.dto';

describe('PublicProfileResponseDto', () => {
  it('carries only what another person may see', () => {
    // Even a row with private columns spread into the domain object must not
    // reach the response.
    const profile = {
      id: 'u2',
      name: 'Petr',
      joinedAt: new Date('2026-09-02T10:00:00Z'),
      bio: null,
      image: null,
      cover: null,
      interests: [],
      gender: 'MALE',
      birthDate: '1990-05-17',
      address: { city: 'Praha' },
      phone: '123',
    } as unknown as PublicProfile;
    expect(
      Object.keys(PublicProfileResponseDto.fromDomain(profile)).sort(),
    ).toEqual([
      'bio',
      'cover',
      'id',
      'image',
      'interests',
      'joinedAt',
      'name',
    ]);
  });
});
