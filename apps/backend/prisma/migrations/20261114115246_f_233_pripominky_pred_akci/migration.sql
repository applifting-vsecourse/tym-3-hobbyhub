-- #233, ADR-0021: reminders 24 hours and 2 hours before an event starts, to
-- its approved participants and its organizers. `event_reminder` holds one row
-- per event, kind and start that a reminder went out for; the unique index is
-- what keeps a reminder from going twice.

-- CreateEnum
CREATE TYPE "event_reminder_kind" AS ENUM ('DAY', 'TWO_HOURS');

-- AlterEnum (several values in one migration need PostgreSQL 12+)
ALTER TYPE "notification_type" ADD VALUE 'EVENT_REMINDER';
ALTER TYPE "notification_type" ADD VALUE 'HOSTED_EVENT_REMINDER';

-- CreateTable
CREATE TABLE "event_reminder" (
    "id" TEXT NOT NULL,
    "kind" "event_reminder_kind" NOT NULL,
    "eventStartAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "event_reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_reminder_eventId_kind_eventStartAt_key" ON "event_reminder"("eventId", "kind", "eventStartAt");

-- AddForeignKey
ALTER TABLE "event_reminder" ADD CONSTRAINT "event_reminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
