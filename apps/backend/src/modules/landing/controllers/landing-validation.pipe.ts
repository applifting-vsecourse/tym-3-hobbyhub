import { ValidationPipe } from '@nestjs/common';

// Its own file so the DTO spec validates exactly what the endpoint does,
// without loading the controller and its auth dependencies.
export const landingValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
