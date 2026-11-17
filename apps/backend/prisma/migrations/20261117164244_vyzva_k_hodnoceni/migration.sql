-- #236, ADR-0021, ADR-0027: výzva k hodnocení po akci. Dva nové typy
-- notifikací (účastník, hlavní organizátor) a záznam, že výzva k akci odešla:
-- cron řádek nejdřív vloží a teprve pak posílá, takže každá výzva odejde jednou.

-- CreateEnum
CREATE TYPE "rating_prompt_kind" AS ENUM ('FIRST', 'LAST_CALL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'RATING_PROMPT';
ALTER TYPE "notification_type" ADD VALUE 'HOSTED_RATING_PROMPT';

-- CreateTable
CREATE TABLE "rating_prompt" (
    "id" TEXT NOT NULL,
    "kind" "rating_prompt_kind" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "rating_prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rating_prompt_eventId_kind_key" ON "rating_prompt"("eventId", "kind");

-- AddForeignKey
ALTER TABLE "rating_prompt" ADD CONSTRAINT "rating_prompt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
