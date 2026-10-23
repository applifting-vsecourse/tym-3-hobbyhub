import {
  BetterAuth,
  InjectBetterAuth,
} from '@/shared/auth/providers/better-auth.provider';
import { getSessionFromRequest } from '@/shared/auth/utils/get-session-from-request';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

// For routes open to visitors that still answer differently when signed in:
// lets everyone through and loads the session when there is one, so
// `@OptionalUser()` can read it.
@Injectable()
export class OptionalUserGuard implements CanActivate {
  constructor(@InjectBetterAuth private readonly betterAuth: BetterAuth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const session = await getSessionFromRequest(request, this.betterAuth);
    if (session) request.session = session;

    return true;
  }
}
