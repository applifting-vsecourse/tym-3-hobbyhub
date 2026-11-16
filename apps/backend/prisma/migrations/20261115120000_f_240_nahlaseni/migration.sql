-- #240, ADR-0023: a user reports an event or another user, the administrators
-- work through the reports in a queue (ADR-0010).
-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'REPORT_RESOLVED';

-- CreateTable
CREATE TABLE "report_reason" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "report_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetEventId" TEXT,
    "targetUserId" TEXT,
    "reasonId" TEXT NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "report_status" NOT NULL DEFAULT 'NEW',
    "assigneeId" TEXT,
    "resolutionNote" VARCHAR(500),
    "resolvedAt" TIMESTAMP(3),
    "reporterNotifiedAt" TIMESTAMP(3),

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_reason_name_key" ON "report_reason"("name");

-- CreateIndex
CREATE UNIQUE INDEX "report_reason_order_key" ON "report_reason"("order");

-- CreateIndex
CREATE INDEX "report_status_createdAt_idx" ON "report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "report_targetEventId_idx" ON "report"("targetEventId");

-- CreateIndex
CREATE INDEX "report_targetUserId_idx" ON "report"("targetUserId");

-- CreateIndex
CREATE INDEX "report_reporterId_idx" ON "report"("reporterId");

-- CreateIndex
CREATE INDEX "report_assigneeId_idx" ON "report"("assigneeId");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_targetEventId_fkey" FOREIGN KEY ("targetEventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "report_reason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



-- ADR-0023: the fixed list of what a report is about, shared by events and
-- users. Names are data and are not translated; "Jiné" stays last.
INSERT INTO "report_reason" ("id", "name", "order")
VALUES
  (gen_random_uuid()::text, 'Obtěžování nebo vyhrožování',   1),
  (gen_random_uuid()::text, 'Nevhodný nebo urážlivý obsah',  2),
  (gen_random_uuid()::text, 'Podvod nebo spam',              3),
  (gen_random_uuid()::text, 'Nebezpečné chování',            4),
  (gen_random_uuid()::text, 'Falešný profil nebo akce',      5),
  (gen_random_uuid()::text, 'Jiné',                          6)
ON CONFLICT ("name") DO NOTHING;

-- A report is about exactly one event or one user, never the reporter.
ALTER TABLE "report" ADD CONSTRAINT "report_one_target"
  CHECK (("targetEventId" IS NULL) <> ("targetUserId" IS NULL));
ALTER TABLE "report" ADD CONSTRAINT "report_not_self"
  CHECK ("targetUserId" IS NULL OR "targetUserId" <> "reporterId");
ALTER TABLE "report" ADD CONSTRAINT "report_text_length"
  CHECK (char_length(btrim("text")) BETWEEN 10 AND 500);

-- Someone is responsible for a report being worked on. A resolved report has
-- a note and a time of resolution, and only a resolved one does.
ALTER TABLE "report" ADD CONSTRAINT "report_in_progress_assigned"
  CHECK ("status" <> 'IN_PROGRESS' OR "assigneeId" IS NOT NULL);
ALTER TABLE "report" ADD CONSTRAINT "report_resolved_all_or_nothing"
  CHECK (("status" = 'RESOLVED') = ("resolvedAt" IS NOT NULL)
     AND ("status" = 'RESOLVED') = ("resolutionNote" IS NOT NULL));
ALTER TABLE "report" ADD CONSTRAINT "report_resolution_note_length"
  CHECK ("resolutionNote" IS NULL OR char_length(btrim("resolutionNote")) BETWEEN 10 AND 500);

-- At most one open report per reporter and target; after it is resolved the
-- reporter may report again.
CREATE UNIQUE INDEX "report_one_open_per_event"
  ON "report"("reporterId", "targetEventId")
  WHERE "status" <> 'RESOLVED' AND "targetEventId" IS NOT NULL;
CREATE UNIQUE INDEX "report_one_open_per_user"
  ON "report"("reporterId", "targetUserId")
  WHERE "status" <> 'RESOLVED' AND "targetUserId" IS NOT NULL;
