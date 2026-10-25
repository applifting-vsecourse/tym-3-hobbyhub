-- AlterTable
ALTER TABLE "event" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "event_groupId_idx" ON "event"("groupId");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
