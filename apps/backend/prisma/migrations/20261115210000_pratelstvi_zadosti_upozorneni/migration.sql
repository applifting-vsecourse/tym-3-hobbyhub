-- #228, ADR-0023: upozornění na žádost o přátelství a na její přijetí.
-- Upozornění na žádost odkazuje na ni: když se smaže (s uživatelem), zmizí
-- i upozornění. Zrušení žádosti upozornění maže ve službě.

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'FRIEND_REQUEST';
ALTER TYPE "notification_type" ADD VALUE 'FRIEND_REQUEST_ACCEPTED';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "friendRequestId" TEXT;

-- CreateIndex
CREATE INDEX "notification_friendRequestId_idx" ON "notification"("friendRequestId");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_friendRequestId_fkey" FOREIGN KEY ("friendRequestId") REFERENCES "friend_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
