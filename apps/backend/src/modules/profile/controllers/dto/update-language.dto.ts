import { Language, LANGUAGES } from '@/shared/auth/registration/registration';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

// #262: the language the app speaks to the user, on every device.
export class UpdateLanguageDto {
  @ApiProperty({ enum: LANGUAGES, example: 'EN' })
  @IsIn(LANGUAGES)
  language!: Language;
}
