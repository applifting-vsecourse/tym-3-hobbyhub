import { ValidationPipe } from '@nestjs/common';

// Its own file so the DTO specs validate exactly what the endpoints do,
// without loading the controller and its auth dependencies.
export const membershipRequestsValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
