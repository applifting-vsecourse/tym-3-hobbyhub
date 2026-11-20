-- #65, ADR-0028: a user blocks another user, one way. A block now says who
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

-- ADR-0028 (review PR #267): a rating is left out where its author does not
-- exist for the rated person, so no number differs from the list they see.
-- An administrator's block keeps the two apart both ways, as before. A user's
-- block hides only the blocker's rating of the one they blocked: a rating the
-- blocked person gave the blocker keeps counting, so blocking its author does
-- not take a bad rating off one's score. Only the block condition changes.
CREATE OR REPLACE VIEW "rating_revealed" AS
SELECT r.*
FROM "rating" r
JOIN "event" e ON e."id" = r."eventId"
WHERE e."endAt" + INTERVAL '7 days' < (now() AT TIME ZONE 'UTC')
  AND e."status" IN ('PUBLISHED', 'FINISHED')
  AND NOT e."isHidden"
  AND NOT EXISTS (
    SELECT 1
    FROM "user_block" b
    WHERE (
        b."source" = 'ADMINISTRATOR'
        AND (
          (b."blockerId" = r."authorId" AND b."blockedId" = r."ratedUserId")
          OR (b."blockerId" = r."ratedUserId" AND b."blockedId" = r."authorId")
        )
      )
      OR (
        b."source" = 'USER'
        AND b."blockerId" = r."authorId"
        AND b."blockedId" = r."ratedUserId"
      )
  );
