-- #239, ADR-0022: an administrator blocks two users from each other and hides
-- an event; what they did goes to the audit log (ADR-0010).
ALTER TYPE "notification_type" ADD VALUE 'EVENT_HIDDEN';
ALTER TYPE "notification_type" ADD VALUE 'EVENT_RESTORED';

-- DropForeignKey
ALTER TABLE "_UserBlocks" DROP CONSTRAINT "_UserBlocks_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserBlocks" DROP CONSTRAINT "_UserBlocks_B_fkey";

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenById" TEXT,
ADD COLUMN     "hiddenReason" VARCHAR(500);

-- DropTable
DROP TABLE "_UserBlocks";

-- CreateTable
CREATE TABLE "user_block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdById" TEXT,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log_entry" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "targetId" TEXT NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_block_blockedId_idx" ON "user_block"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_block_blockerId_blockedId_key" ON "user_block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "audit_log_entry_targetType_targetId_idx" ON "audit_log_entry"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_log_entry_createdAt_idx" ON "audit_log_entry"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_hiddenById_fkey" FOREIGN KEY ("hiddenById") REFERENCES "administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log_entry" ADD CONSTRAINT "audit_log_entry_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Events hidden before ADR-0022 (seed data) have no record of who hid them or
-- why; they stay hidden with a generic reason.
UPDATE "event"
SET "hiddenAt" = CURRENT_TIMESTAMP,
    "hiddenReason" = 'Skryto správcem před zavedením důvodu skrytí.'
WHERE "isHidden";

-- Hidden means since when and why; who hid it is known for every event hidden
-- through the administration (empty only for the rows above).
ALTER TABLE "event" ADD CONSTRAINT "event_hidden_all_or_nothing"
  CHECK ("isHidden" = ("hiddenAt" IS NOT NULL)
     AND "isHidden" = ("hiddenReason" IS NOT NULL)
     AND ("hiddenById" IS NULL OR "isHidden"));
ALTER TABLE "event" ADD CONSTRAINT "event_hidden_reason_length"
  CHECK ("hiddenReason" IS NULL OR char_length(btrim("hiddenReason")) BETWEEN 10 AND 500);

-- Nobody blocks themselves. A block made by an administrator carries a reason
-- (and only such a block does) and is stored once per pair, with the smaller
-- id as the blocker, so the unique key covers both orders.
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_not_self"
  CHECK ("blockerId" <> "blockedId");
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_admin_reason"
  CHECK (("createdById" IS NULL) = ("reason" IS NULL));
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_reason_length"
  CHECK ("reason" IS NULL OR char_length(btrim("reason")) BETWEEN 10 AND 500);
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_admin_ordered"
  CHECK ("createdById" IS NULL OR "blockerId" < "blockedId");
