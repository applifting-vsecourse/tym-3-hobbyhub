import { profileValidationPipe } from '@/modules/profile/controllers/profile-validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { UpdateLanguageDto } from './update-language.dto';

const validate = (body: Record<string, unknown>): Promise<UpdateLanguageDto> =>
  profileValidationPipe.transform(body, {
    type: 'body',
    metatype: UpdateLanguageDto,
  }) as Promise<UpdateLanguageDto>;

describe('UpdateLanguageDto', () => {
  it.each(['CS', 'EN'])('accepts %s', async (language) => {
    await expect(validate({ language })).resolves.toMatchObject({ language });
  });

  it.each([
    ['no language', {}],
    ['a language the app does not speak', { language: 'DE' }],
    ['a language in lower case', { language: 'en' }],
    ['an unknown field', { language: 'CS', theme: 'dark' }],
  ])('refuses %s', async (_name, body) => {
    await expect(validate(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
