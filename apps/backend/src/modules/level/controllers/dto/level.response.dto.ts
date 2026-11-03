import { Level } from '@/modules/level/domain/level';
import { ApiProperty } from '@nestjs/swagger';

export class LevelResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Pokročilí' })
  name!: string;

  static fromDomain(level: Level): LevelResponseDto {
    return { id: level.id, name: level.name };
  }
}
