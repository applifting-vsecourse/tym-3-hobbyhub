-- AlterTable
ALTER TABLE "participation_request" ADD COLUMN     "rejectionReason" VARCHAR(500);

-- Not expressible in Prisma (see the note at the top of schema.prisma).

-- ADR-0008: the reason belongs to a rejection only.
ALTER TABLE "participation_request" ADD CONSTRAINT "participation_request_rejection_reason_only_rejected" CHECK ("rejectionReason" IS NULL OR "status" = 'REJECTED');

-- Same as the message: optional, but never blank, with blank meaning what the
-- API's `String.prototype.trim()` drops (see `f_06_1_zprava_bez_bilych_znaku`).
ALTER TABLE "participation_request" ADD CONSTRAINT "participation_request_rejection_reason_not_blank" CHECK (
  "rejectionReason" IS NULL OR btrim(
    "rejectionReason",
    E'\u0009\u000A\u000B\u000C\u000D                  　﻿'
  ) <> ''
);
