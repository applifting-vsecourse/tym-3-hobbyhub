// #240, ADR-0010, ADR-0023: a user reports an event or another user; a report
// of a user asks for the two to be blocked from each other. Only the
// administration sees reports; it works through them in a queue.

export const REPORT_TEXT_MIN_LENGTH = 10;
export const REPORT_TEXT_MAX_LENGTH = 500;
export const REPORT_RESOLUTION_NOTE_MIN_LENGTH = 10;
export const REPORT_RESOLUTION_NOTE_MAX_LENGTH = 500;

export const REPORT_TARGET_TYPES = ['EVENT', 'USER'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// What the queue filters by: the open ones (new and in progress) by default.
export const REPORT_STATUS_FILTERS = [
  'OPEN',
  'ALL',
  ...REPORT_STATUSES,
] as const;
export type ReportStatusFilter = (typeof REPORT_STATUS_FILTERS)[number];

export const statusesOf = (
  filter: ReportStatusFilter,
): readonly ReportStatus[] => {
  if (filter === 'OPEN') return ['NEW', 'IN_PROGRESS'];
  if (filter === 'ALL') return REPORT_STATUSES;
  return [filter];
};

export const isOpen = (status: ReportStatus): boolean => status !== 'RESOLVED';

// ---------------------------------------------------------------------------
// The reporter's side.
// ---------------------------------------------------------------------------

export type ReportTarget = { type: ReportTargetType; id: string };

export type NewReport = {
  reporterId: string;
  target: ReportTarget;
  reasonId: string;
  text: string;
};

// What the reporter gets back: that it arrived, nothing of the queue.
export type FiledReport = { id: string; createdAt: Date };

export type ReportViolation =
  'SELF' | 'OWN_EVENT' | 'UNKNOWN_REASON' | 'ALREADY_REPORTED';

/**
 * Nobody reports themselves, nor an event they organize or co-organize.
 * `organizerIds` is there for an event only.
 */
export const reportRuleViolations = (input: {
  reporterId: string;
  target: ReportTarget;
  organizerIds?: readonly string[];
}): ReportViolation[] => {
  if (input.target.type === 'USER') {
    return input.target.id === input.reporterId ? ['SELF'] : [];
  }
  return (input.organizerIds ?? []).includes(input.reporterId)
    ? ['OWN_EVENT']
    : [];
};

// ---------------------------------------------------------------------------
// The administration's side: the queue.
// ---------------------------------------------------------------------------

export type ReportRef = { id: string; name: string };

export type AdminReportListItem = {
  id: string;
  status: ReportStatus;
  createdAt: Date;
  // The event's title or the user's name.
  target: ReportTarget & { name: string };
  reason: ReportRef;
  reporter: ReportRef;
  assignee: ReportRef | null;
  // Other open reports about the same target, from anyone.
  otherOpenReports: number;
};

export const REPORT_HISTORY_ACTIONS = [
  'CREATED',
  'ASSIGNED',
  'RESOLVED',
  'REOPENED',
] as const;
export type ReportHistoryAction = (typeof REPORT_HISTORY_ACTIONS)[number];

export type ReportHistoryEntry = {
  action: ReportHistoryAction;
  at: Date;
  // Null for CREATED: the reporter is no administrator.
  admin: ReportRef | null;
  // ASSIGNED: whom it went to; RESOLVED: the note.
  description: string | null;
};

export type AdminReportDetail = Omit<
  AdminReportListItem,
  'otherOpenReports'
> & {
  text: string;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  otherOpenReports: Omit<AdminReportListItem, 'otherOpenReports'>[];
  history: ReportHistoryEntry[];
};

export type AdminReportFilter = {
  status: ReportStatusFilter;
  targetType?: ReportTargetType;
  assigneeId?: string;
  offset: number;
};

// The facts a change of state is decided on; the repository makes the change
// only while they still hold, so two administrators cannot both act.
export type ReportState = {
  status: ReportStatus;
  assigneeId: string | null;
};

export type ReportTransitionViolation =
  | 'ALREADY_RESOLVED'
  | 'NOT_RESOLVED'
  | 'ALREADY_ASSIGNED'
  | 'ASSIGNEE_NOT_ACTIVE';

/** Taking a report over, or handing it to a colleague. */
export const assignViolations = (
  report: ReportState,
  assigneeId: string,
): ReportTransitionViolation[] => {
  if (report.status === 'RESOLVED') return ['ALREADY_RESOLVED'];
  if (report.status === 'IN_PROGRESS' && report.assigneeId === assigneeId) {
    return ['ALREADY_ASSIGNED'];
  }
  return [];
};

export const resolveViolations = (
  report: ReportState,
): ReportTransitionViolation[] =>
  report.status === 'RESOLVED' ? ['ALREADY_RESOLVED'] : [];

export const reopenViolations = (
  report: ReportState,
): ReportTransitionViolation[] =>
  report.status === 'RESOLVED' ? [] : ['NOT_RESOLVED'];

// The detail of a user in the administration: reports about them, and the
// ones they filed. Newest first, every state.
export type AdminUserReports = {
  about: AdminReportListItem[];
  filed: AdminReportListItem[];
};
