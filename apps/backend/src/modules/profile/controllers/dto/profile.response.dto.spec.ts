import { PublicProfile } from '@/modules/profile/domain/profile';
import { PublicProfileResponseDto } from './profile.response.dto';

describe('PublicProfileResponseDto', () => {
  it('carries only what another person may see', () => {
    // Even a row with private columns spread into the domain object must not
    // reach the response.
    const profile = {
      id: 'u2',
      name: 'Petr',
      bio: null,
      image: null,
      cover: null,
      interests: [],
      gender: 'MALE',
      birthYear: 1990,
      address: { city: 'Praha' },
      phone: '123',
      nicknameChangeableFrom: new Date('2026-12-01T00:00:00Z'),
    } as unknown as PublicProfile;
    const response = PublicProfileResponseDto.fromDomain(profile);
    expect(response).not.toHaveProperty('email');
    expect(response).not.toHaveProperty('nicknameChangeableFrom');
    expect(Object.keys(response).sort()).toEqual([
      'bio',
      'cover',
      'id',
      'image',
      'interests',
      'name',
    ]);
  });
});
