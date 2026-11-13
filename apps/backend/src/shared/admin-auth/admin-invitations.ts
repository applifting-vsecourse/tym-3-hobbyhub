import { randomBytes } from 'node:crypto';
import {
  EmailOutbox,
  InjectEmailOutbox,
} from '@/core/email/outbox/email-outbox.interface';
import {
  ADMIN_INVITATION_TTL_SECONDS,
  adminSetPasswordUrl,
  enqueueAdminPasswordEmail,
  RESET_PASSWORD_IDENTIFIER_PREFIX,
} from '@/shared/admin-auth/password-links';
import {
  AdminAuth,
  InjectAdminAuth,
} from '@/shared/admin-auth/providers/admin-auth.provider';
import { Config } from '@/shared/config/config.service';
import { Injectable } from '@nestjs/common';

/**
 * ADR-0021: the invitation is BetterAuth's password-reset token, issued here
 * for 72 hours instead of the hour "Zapomenuté heslo" gets. Setting the
 * password through it creates the credential an invited administrator lacks.
 * Revoking the older links is the caller's job.
 */
@Injectable()
export class AdminInvitations {
  constructor(
    @InjectAdminAuth private readonly adminAuth: AdminAuth,
    private readonly config: Config,
    @InjectEmailOutbox() private readonly emailOutbox: EmailOutbox,
  ) {}

  async send(administrator: { id: string; email: string }): Promise<void> {
    // As long as BetterAuth's own tokens: 24 characters, URL-safe.
    const token = randomBytes(18).toString('base64url');
    const context = await this.adminAuth.$context;
    await context.internalAdapter.createVerificationValue({
      identifier: `${RESET_PASSWORD_IDENTIFIER_PREFIX}${token}`,
      value: administrator.id,
      expiresAt: new Date(Date.now() + ADMIN_INVITATION_TTL_SECONDS * 1000),
    });
    await enqueueAdminPasswordEmail(
      this.emailOutbox,
      'invitation',
      administrator,
      adminSetPasswordUrl(this.config, token),
    );
  }
}
