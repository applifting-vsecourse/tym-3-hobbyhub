// What the provider said about a message it accepted (F-09.5): its id there,
// so a delivery can be looked up in the provider's log. Null when the adapter
// has none (the console).
export type SentEmail = { messageId: string | null };

export interface EmailService {
  sendEmail(to: string, subject: string, html: string): Promise<SentEmail>;
}
