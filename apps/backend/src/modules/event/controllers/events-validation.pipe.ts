import { ValidationPipe } from '@nestjs/common';

// Its own file so a DTO spec can validate exactly what the endpoint does.
export const eventsValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
