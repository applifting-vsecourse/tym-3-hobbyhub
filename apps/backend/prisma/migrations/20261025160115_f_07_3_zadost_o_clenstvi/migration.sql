-- CreateTable
CREATE TABLE "membership_request" (
    "id" TEXT NOT NULL,
    "status" "request_status" NOT NULL DEFAULT 'PENDING',
    "message" VARCHAR(500),
    "rejectionReason" VARCHAR(500),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "membership_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_request_groupId_status_idx" ON "membership_request"("groupId", "status");

-- CreateIndex
CREATE INDEX "membership_request_userId_idx" ON "membership_request"("userId");

-- AddForeignKey
ALTER TABLE "membership_request" ADD CONSTRAINT "membership_request_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_request" ADD CONSTRAINT "membership_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Not expressible in Prisma (see the note at the top of schema.prisma).

-- One waiting request per person and group (F-07.3). Ended requests stay as
-- history, so a person who withdrew can ask again.
CREATE UNIQUE INDEX "membership_request_one_pending_key" ON "membership_request"("groupId", "userId") WHERE "status" = 'PENDING';

-- ADR-0008: a pending request has no decision yet; every other one has.
ALTER TABLE "membership_request" ADD CONSTRAINT "membership_request_decided_at_with_status" CHECK (("status" = 'PENDING') = ("decidedAt" IS NULL));

-- ADR-0008: the reason belongs to a rejection only.
ALTER TABLE "membership_request" ADD CONSTRAINT "membership_request_rejection_reason_only_rejected" CHECK ("rejectionReason" IS NULL OR "status" = 'REJECTED');

-- Same limits as the API: the message and the reason are optional, but never
-- blank, with blank meaning what the API's `String.prototype.trim()` drops
-- (see `f_06_1_zprava_bez_bilych_znaku`). `VARCHAR(500)` counts characters,
-- as the API (`CharLength`) does.
ALTER TABLE "membership_request" ADD CONSTRAINT "membership_request_message_not_blank" CHECK (
  "message" IS NULL OR btrim(
    "message",
    E'\u0009\u000A\u000B\u000C\u000D                  　﻿'
  ) <> ''
);
ALTER TABLE "membership_request" ADD CONSTRAINT "membership_request_rejection_reason_not_blank" CHECK (
  "rejectionReason" IS NULL OR btrim(
    "rejectionReason",
    E'\u0009\u000A\u000B\u000C\u000D                  　﻿'
  ) <> ''
);
