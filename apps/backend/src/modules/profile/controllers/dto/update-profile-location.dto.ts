import { SaveLocationDto } from '@/modules/onboarding/controllers/dto/save-onboarding.dto';
import { OmitType } from '@nestjs/swagger';

// The same address as the onboarding step; the travel radius is out of scope
// of the profile.
export class UpdateProfileLocationDto extends OmitType(SaveLocationDto, [
  'travelRadiusKm',
] as const) {}
