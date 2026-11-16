import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Without `administratorId` the signed-in administrator takes the report
// over; with it they hand it to an active colleague.
export class AssignReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  administratorId?: string;
}
