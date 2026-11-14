import { Prisma } from '@/generated/prisma/client';

// ADR-0010, ADR-0022: what an administrator did, kept as evidence. Written in
// the same transaction as the change itself, so no change goes unrecorded:
// every module whose repository makes an administrator's change calls
// `recordAuditLogEntry` with its transaction. Reading the log comes with #70.

export const AUDIT_ACTIONS = [
  'EVENT_HIDDEN',
  'EVENT_RESTORED',
  'USERS_BLOCKED',
  'USERS_UNBLOCKED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_TARGET_TYPES = ['EVENT', 'USER'] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

export type AuditLogEntryInput = {
  adminId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  // The reason the administrator gave, or what the target was.
  description?: string;
};

export const recordAuditLogEntry = async (
  tx: Prisma.TransactionClient,
  entry: AuditLogEntryInput,
): Promise<void> => {
  await tx.auditLogEntry.create({
    data: {
      adminId: entry.adminId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      description: entry.description ?? null,
    },
  });
};
