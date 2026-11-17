-- #65, ADR-0027: a user blocks another user, one way. A block now says who
-- made it, so a user and an administrator may each block the same pair.

-- CreateEnum
CREATE TYPE "UserBlockSource" AS ENUM ('ADMINISTRATOR', 'USER');

-- DropIndex
DROP INDEX "user_block_blockerId_blockedId_key";

-- AlterTable: every block so far was made by an administrator (#239).
ALTER TABLE "user_block" ADD COLUMN "source" "UserBlockSource";
UPDATE "user_block" SET "source" = 'ADMINISTRATOR';
ALTER TABLE "user_block" ALTER COLUMN "source" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_block_blockerId_blockedId_source_key" ON "user_block"("blockerId", "blockedId", "source");

-- The source and the administrator go together: an administrator's block
-- names them (and has a reason, CHECK user_block_admin_reason); a user's does not.
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_source"
  CHECK (("source" = 'ADMINISTRATOR') = ("createdById" IS NOT NULL));
