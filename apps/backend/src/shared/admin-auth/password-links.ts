import { EmailOutbox } from '@/core/email/outbox/email-outbox.interface';
import { renderEmail } from '@/core/email/render';
import {
  ADMIN_INVITATION_SUBJECT,
  AdminInvitation,
} from '@/core/email/templates/admin-invitation';
import {
  ADMIN_RESET_PASSWORD_SUBJECT,
  AdminResetPassword,
} from '@/core/email/templates/admin-reset-password';
import { Config } from '@/shared/config/config.service';

// ADR-0021: an invitation and a password reset are the same link, BetterAuth's
// `reset-password` token: setting a password through it also creates the
// missing credential of an invited administrator.
export const ADMIN_INVITATION_TTL_SECONDS = 72 * 60 * 60;
export const ADMIN_RESET_PASSWORD_TTL_SECONDS = 60 * 60;

/** The prefix BetterAuth stores a password-reset token under. */
export const RESET_PASSWORD_IDENTIFIER_PREFIX = 'reset-password:';

export const adminSetPasswordUrl = (config: Config, token: string): string =>
  `${config.frontendUrl}/admin/set-password?token=${encodeURIComponent(token)}`;

type Recipient = { id: string; email: string };

/**
 * Queues the e-mail with the link. Critical: it goes first and the
 * per-recipient cap does not apply (ADR-0018). It carries the link only, as
 * the visibility matrix allows for setting a password.
 */
export const enqueueAdminPasswordEmail = async (
  outbox: EmailOutbox,
  purpose: 'invitation' | 'reset',
  administrator: Recipient,
  url: string,
): Promise<void> => {
  const isInvitation = purpose === 'invitation';
  const html = isInvitation
    ? await renderEmail(AdminInvitation, { url })
    : await renderEmail(AdminResetPassword, { url });
  await outbox.enqueue([
    {
      kind: isInvitation ? 'ADMIN_INVITATION' : 'RESET_PASSWORD',
      critical: true,
      administratorId: administrator.id,
      to: administrator.email,
      subject: isInvitation
        ? ADMIN_INVITATION_SUBJECT
        : ADMIN_RESET_PASSWORD_SUBJECT,
      html,
    },
  ]);
};
