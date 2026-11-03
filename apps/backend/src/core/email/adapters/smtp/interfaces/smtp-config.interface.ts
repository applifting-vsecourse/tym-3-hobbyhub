export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  /** The sender; the user name when omitted (Gmail), needed where it is not an address (Mailjet). */
  from?: string;
}
