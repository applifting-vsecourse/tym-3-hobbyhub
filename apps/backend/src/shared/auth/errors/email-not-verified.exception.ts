import { BadRequestException } from '@nestjs/common';

// F-03.2: what a person with an unverified e-mail may not do (asking to join,
// publishing an event, founding a group). Same body as a refused request to
// join, so the client reads the `violations` of both alike.
export const emailNotVerifiedException = (
  action: string,
): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: [`Verify your email address before ${action}`],
    violations: ['EMAIL_NOT_VERIFIED'],
  });
