import { Identity } from '@/shared/auth/domain/identity';
import {
  createParamDecorator,
  ExecutionContext,
  NotImplementedException,
} from '@nestjs/common';

export const User = createParamDecorator(
  async (data: unknown, context: ExecutionContext): Promise<Identity> => {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.session.user;
    }
    throw new NotImplementedException(
      `Cannot retrieve user from ${context.getType()} context`,
    );
  },
);

// The signed-in user, or undefined for a visitor. Pair it with
// `OptionalUserGuard`, which loads the session without requiring one.
export const OptionalUser = createParamDecorator(
  async (
    data: unknown,
    context: ExecutionContext,
  ): Promise<Identity | undefined> => {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.session?.user;
    }
    throw new NotImplementedException(
      `Cannot retrieve user from ${context.getType()} context`,
    );
  },
);
