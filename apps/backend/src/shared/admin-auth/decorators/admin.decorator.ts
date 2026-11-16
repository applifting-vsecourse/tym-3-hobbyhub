import { AdminIdentity } from '@/shared/admin-auth/domain/administrator';
import {
  createParamDecorator,
  ExecutionContext,
  NotImplementedException,
} from '@nestjs/common';

// The signed-in administrator. Pair it with `AdministratorGuard`.
export const Admin = createParamDecorator(
  (data: unknown, context: ExecutionContext): AdminIdentity => {
    if (context.getType() !== 'http') {
      throw new NotImplementedException(
        `Cannot retrieve administrator from ${context.getType()} context`,
      );
    }
    const { id, email, name } = context.switchToHttp().getRequest()
      .adminSession.user;
    return { id, email, name };
  },
);
