import {
  AdminAuth,
  InjectAdminAuth,
} from '@/shared/admin-auth/providers/admin-auth.provider';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';

// Every `/api/admin/*` route. Reads only the admin cookie: a user signed in to
// the app gets 401 here like a visitor. The session goes to
// `request.adminSession`, never to `request.session`, so `@User()` cannot
// mistake an administrator for a user.
@Injectable()
export class AdministratorGuard implements CanActivate {
  constructor(@InjectAdminAuth private readonly adminAuth: AdminAuth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = await this.adminAuth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) throw new UnauthorizedException();

    request.adminSession = session;
    return true;
  }
}
