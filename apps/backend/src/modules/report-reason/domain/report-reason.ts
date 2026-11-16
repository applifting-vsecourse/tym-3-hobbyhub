// ADR-0023: what a report is about, from a fixed list the migration fills.
// Shared by reports of events and of users.
export type ReportReason = {
  id: string;
  name: string;
};
