import { ResendCooldown } from './resend-cooldown';

// F-03.5: the reset e-mail goes to one address at most once a minute, counted
// apart from the verification e-mail so one does not block the other.
export const passwordResetCooldown = new ResendCooldown();
