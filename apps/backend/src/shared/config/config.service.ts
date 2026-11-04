import { Env } from '@applifting-io/nestjs-decorated-config';
import { Injectable } from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsSemVer,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

/**
 * A config class that is populated from environment variables and enable the use of validation decorators.
 */
@Injectable()
export class Config {
  // basic info
  readonly name: string = 'Quacker backend';
  readonly description: string =
    'Backend for Quacker, a social media platform for sharing short messages. Project example for educational purposes.';

  @IsSemVer()
  readonly version: string = '0.1.0';

  @Env<string>('CI_COMMIT_SHA', { expose: true })
  @IsOptional()
  readonly gitCommitSha?: string;

  @Env<string>('BETTER_AUTH_SECRET')
  @IsNotEmpty()
  readonly betterAuthSecret!: string;

  @Env('SUPERADMIN_EMAIL')
  readonly superadminEmail!: string;

  @Env('SUPERADMIN_PASSWORD')
  readonly superadminPassword!: string;

  @Env('NODE_ENV', { expose: true })
  @IsOptional()
  readonly nodeEnv?: string;

  @Env('BACKEND_URL', {
    defaultValue: 'http://localhost:4050',
    expose: true,
    removeTrailingSlash: true,
  })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  readonly backendUrl!: string;

  @Env('FRONTEND_URL', {
    defaultValue: 'http://localhost:3050',
    expose: true,
    removeTrailingSlash: true,
  })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  readonly frontendUrl!: string;

  @Env('FRONTEND_RESET_PASSWORD_ROUTE', {
    defaultValue: 'reset-password',
    expose: true,
  })
  @IsNotEmpty()
  readonly frontendResetPasswordUrl!: string;

  @Env('PORT', { expose: true, defaultValue: 4050 })
  readonly port!: number;

  @Env('RESEND_API_KEY')
  @IsOptional()
  readonly resendApiKey?: string;

  @Env('EMAIL_FROM', {
    expose: true,
    defaultValue: 'Quacker <onboarding@resend.dev>',
  })
  @IsNotEmpty()
  readonly emailFrom!: string;

  @Env('SMTP_HOST', { expose: true })
  @IsOptional()
  readonly smtpHost?: string;

  @Env('SMTP_SECURE', { expose: true, defaultValue: true })
  @IsBoolean()
  readonly smtpSecure!: boolean;

  @Env('SMTP_PORT', { expose: true, defaultValue: 465 })
  readonly smtpPort!: number;

  @Env('SMTP_USERNAME', { expose: true })
  @IsOptional()
  readonly smtpUsername?: string;

  @Env('SMTP_PASSWORD')
  @IsOptional()
  readonly smtpPassword?: string;

  // The sender of SMTP mail, e.g. `HobbyHub <noreply@example.com>`. Needed when
  // the user name is not an address (Mailjet's is an API key); otherwise the
  // user name is the sender.
  @Env('SMTP_FROM', { expose: true })
  @IsOptional()
  readonly smtpFrom?: string;

  // F-09.5, ADR-0016: the outbox's limits. How many e-mails may go in any 24
  // hours: the provider's daily limit (Mailjet's free plan: 200).
  @Env('EMAIL_DAILY_LIMIT', { expose: true, defaultValue: 200 })
  @IsInt()
  @Min(1)
  readonly emailDailyLimit!: number;

  // The share of the daily limit kept for critical e-mails (sign-in, a changed
  // or cancelled event); the others wait once the rest is used up.
  @Env('EMAIL_CRITICAL_RESERVE_PERCENT', { expose: true, defaultValue: 20 })
  @IsInt()
  @Min(0)
  @Max(100)
  readonly emailCriticalReservePercent!: number;

  // At most this many non-critical e-mails to one person in an hour; the rest
  // are only in the bell.
  @Env('EMAIL_RECIPIENT_HOURLY_LIMIT', { expose: true, defaultValue: 10 })
  @IsInt()
  @Min(1)
  readonly emailRecipientHourlyLimit!: number;

  // How often the poller looks for due e-mails.
  @Env('EMAIL_POLL_INTERVAL_MS', { expose: true, defaultValue: 5000 })
  @IsInt()
  @Min(500)
  readonly emailPollIntervalMs!: number;
}
