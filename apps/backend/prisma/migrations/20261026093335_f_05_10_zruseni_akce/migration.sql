-- AlterTable
ALTER TABLE "event" ADD COLUMN     "cancellationNote" VARCHAR(500);

ALTER TABLE "event" ADD CONSTRAINT "event_cancellation_note_length" CHECK ("cancellationNote" IS NULL OR char_length("cancellationNote") <= 500);
