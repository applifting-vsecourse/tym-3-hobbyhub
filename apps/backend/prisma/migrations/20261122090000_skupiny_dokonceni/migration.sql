-- #276, ADR-0028: skupiny dotažené podle návrhu. Skupina se schvalováním nebo
-- bez něj, dny, kdy se schází, a poloha pro mapu a filtr podle vzdálenosti.

-- CreateEnum
CREATE TYPE "group_approval_mode" AS ENUM ('OPEN', 'APPROVAL');

-- AlterTable
ALTER TABLE "group" ADD COLUMN     "approvalMode" "group_approval_mode" NOT NULL DEFAULT 'APPROVAL',
ADD COLUMN     "locationLatitude" DECIMAL(9,6),
ADD COLUMN     "locationLongitude" DECIMAL(9,6),
ADD COLUMN     "meetingDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Poslední záchrana, stejně jako u akcí: dny jsou 1 (pondělí) až 7 (neděle) a
-- poloha je celá, nebo žádná.
ALTER TABLE "group"
  ADD CONSTRAINT "group_meeting_days_range"
  CHECK ("meetingDays" <@ ARRAY[1, 2, 3, 4, 5, 6, 7]);
ALTER TABLE "group"
  ADD CONSTRAINT "group_location_both_or_none"
  CHECK (("locationLatitude" IS NULL) = ("locationLongitude" IS NULL));
