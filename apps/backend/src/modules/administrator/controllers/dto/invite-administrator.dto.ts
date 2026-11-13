import {
  ADMINISTRATOR_EMAIL_MAX_LENGTH,
  ADMINISTRATOR_NAME_MAX_LENGTH,
} from '@/modules/administrator/domain/administrator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

// #237: who to invite. The password is theirs to set (ADR-0021).
export class InviteAdministratorDto {
  @ApiProperty({ maxLength: ADMINISTRATOR_EMAIL_MAX_LENGTH })
  @Transform(trimmed)
  @IsEmail()
  @MaxLength(ADMINISTRATOR_EMAIL_MAX_LENGTH)
  email!: string;

  @ApiProperty({ maxLength: ADMINISTRATOR_NAME_MAX_LENGTH })
  @Transform(trimmed)
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADMINISTRATOR_NAME_MAX_LENGTH)
  name!: string;
}
