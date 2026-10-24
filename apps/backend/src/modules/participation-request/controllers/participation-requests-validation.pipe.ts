import { ValidationPipe } from '@nestjs/common';

// Its own file so the DTO spec validates exactly what the endpoints do,
// without loading the controller and its auth dependencies.
export const participationRequestsValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
