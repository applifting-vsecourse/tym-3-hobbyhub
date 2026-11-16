import { ValidationPipe } from '@nestjs/common';

// Every `/api/admin/*` controller; its own file so a DTO spec validates
// exactly what the endpoints do.
export const adminValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
