-- CreateEnum
CREATE TYPE "language" AS ENUM ('CS', 'EN');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'RESTRICTED', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('NEW_REQUESTS', 'PARTICIPANT_CANCELLED', 'REQUEST_DECIDED', 'CONFIRMATION_PROMPT', 'SPOT_AVAILABLE', 'GROUP_INVITATION', 'EVENT_BOARD', 'ONBOARDING_SERIES', 'MONTHLY_RECOMMENDATION');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'FINISHED', 'NOT_HELD');

-- CreateEnum
CREATE TYPE "event_visibility" AS ENUM ('PUBLIC', 'GROUP_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "approval_mode" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "venue_type" AS ENUM ('PUBLIC_VENUE', 'PRIVATE_VENUE', 'ONLINE');

-- CreateEnum
CREATE TYPE "participation_status" AS ENUM ('APPROVED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW', 'INVITED', 'DECLINED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "disabledNotifications" "notification_type"[] DEFAULT ARRAY[]::"notification_type"[],
ADD COLUMN     "gender" "gender",
ADD COLUMN     "homeCity" VARCHAR(100),
ADD COLUMN     "homeCountry" VARCHAR(100),
ADD COLUMN     "homeDistrict" VARCHAR(100),
ADD COLUMN     "homeLatitude" DECIMAL(9,6),
ADD COLUMN     "homeLongitude" DECIMAL(9,6),
ADD COLUMN     "homePlaceName" VARCHAR(200),
ADD COLUMN     "homePostalCode" VARCHAR(20),
ADD COLUMN     "homeStreet" VARCHAR(200),
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "phone" VARCHAR(30),
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "preferredLanguage" "language" NOT NULL DEFAULT 'CS',
ADD COLUMN     "prefersOnlineEvents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "temporaryCity" VARCHAR(100),
ADD COLUMN     "temporaryCountry" VARCHAR(100),
ADD COLUMN     "temporaryDistrict" VARCHAR(100),
ADD COLUMN     "temporaryLatitude" DECIMAL(9,6),
ADD COLUMN     "temporaryLocationValidUntil" TIMESTAMP(3),
ADD COLUMN     "temporaryLongitude" DECIMAL(9,6),
ADD COLUMN     "temporaryPlaceName" VARCHAR(200),
ADD COLUMN     "temporaryPostalCode" VARCHAR(20),
ADD COLUMN     "temporaryStreet" VARCHAR(200),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" VARCHAR(20),
ADD COLUMN     "travelRadiusKm" INTEGER;

-- CreateTable
CREATE TABLE "activity_category" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "activity_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50) NOT NULL,
    "defaultMinParticipants" INTEGER NOT NULL,
    "defaultMaxParticipants" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_reason" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,

    CONSTRAINT "cancellation_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "equipment" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "status" "event_status" NOT NULL DEFAULT 'DRAFT',
    "visibility" "event_visibility" NOT NULL DEFAULT 'PUBLIC',
    "approvalMode" "approval_mode" NOT NULL DEFAULT 'MANUAL',
    "venueType" "venue_type" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "minParticipants" INTEGER NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "externalOccupiedSpots" INTEGER NOT NULL DEFAULT 0,
    "fillDeadlineHours" INTEGER NOT NULL,
    "freeCancellationHours" INTEGER,
    "confirmationRequestDaysBefore" INTEGER,
    "contributionAmount" DECIMAL(10,2),
    "inviteToken" VARCHAR(100),
    "externalChatUrl" TEXT,
    "onlineUrl" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "locationStreet" VARCHAR(200),
    "locationCity" VARCHAR(100),
    "locationPostalCode" VARCHAR(20),
    "locationCountry" VARCHAR(100),
    "locationDistrict" VARCHAR(100),
    "locationPlaceName" VARCHAR(200),
    "locationLatitude" DECIMAL(9,6),
    "locationLongitude" DECIMAL(9,6),
    "activityId" TEXT NOT NULL,
    "levelId" TEXT,
    "organizerId" TEXT NOT NULL,
    "copiedFromId" TEXT,
    "cancellationReasonId" TEXT,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participation" (
    "id" TEXT NOT NULL,
    "status" "participation_status" NOT NULL,
    "waitlistPosition" INTEGER,
    "offerExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "isLateCancellation" BOOLEAN NOT NULL DEFAULT false,
    "checkInCode" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventCoOrganizers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventCoOrganizers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UserBlocks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserBlocks_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_category_name_key" ON "activity_category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "activity_name_key" ON "activity"("name");

-- CreateIndex
CREATE INDEX "activity_categoryId_idx" ON "activity"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "level_name_key" ON "level"("name");

-- CreateIndex
CREATE UNIQUE INDEX "level_order_key" ON "level"("order");

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_reason_name_key" ON "cancellation_reason"("name");

-- CreateIndex
CREATE UNIQUE INDEX "event_inviteToken_key" ON "event"("inviteToken");

-- CreateIndex
CREATE INDEX "event_organizerId_idx" ON "event"("organizerId");

-- CreateIndex
CREATE INDEX "event_activityId_idx" ON "event"("activityId");

-- CreateIndex
CREATE INDEX "event_status_visibility_startAt_idx" ON "event"("status", "visibility", "startAt");

-- CreateIndex
CREATE INDEX "participation_userId_idx" ON "participation"("userId");

-- CreateIndex
CREATE INDEX "participation_eventId_status_idx" ON "participation"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "participation_eventId_userId_key" ON "participation"("eventId", "userId");

-- CreateIndex
CREATE INDEX "_EventCoOrganizers_B_index" ON "_EventCoOrganizers"("B");

-- CreateIndex
CREATE INDEX "_UserBlocks_B_index" ON "_UserBlocks"("B");

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "activity_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_copiedFromId_fkey" FOREIGN KEY ("copiedFromId") REFERENCES "event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_cancellationReasonId_fkey" FOREIGN KEY ("cancellationReasonId") REFERENCES "cancellation_reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventCoOrganizers" ADD CONSTRAINT "_EventCoOrganizers_A_fkey" FOREIGN KEY ("A") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventCoOrganizers" ADD CONSTRAINT "_EventCoOrganizers_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBlocks" ADD CONSTRAINT "_UserBlocks_A_fkey" FOREIGN KEY ("A") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBlocks" ADD CONSTRAINT "_UserBlocks_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Omezení z doménového modelu, která Prisma neumí vyjádřit.
-- ---------------------------------------------------------------------------

-- Event: čas a kapacita
ALTER TABLE "event" ADD CONSTRAINT "event_end_after_start" CHECK ("endAt" > "startAt");
ALTER TABLE "event" ADD CONSTRAINT "event_min_lte_max" CHECK ("minParticipants" <= "maxParticipants");
ALTER TABLE "event" ADD CONSTRAINT "event_min_positive" CHECK ("minParticipants" >= 1);
ALTER TABLE "event" ADD CONSTRAINT "event_external_spots_non_negative" CHECK ("externalOccupiedSpots" >= 0);
-- /occupiedSpots <= maxParticipants (approved participations are counted in code)
ALTER TABLE "event" ADD CONSTRAINT "event_external_spots_lte_max" CHECK ("externalOccupiedSpots" <= "maxParticipants");

-- Event: adresa je buď celá (povinné části), nebo žádná; online akce adresu nemá.
-- Že akce na místě adresu mít musí, se kontroluje při publikování.
ALTER TABLE "event" ADD CONSTRAINT "event_location_all_or_nothing" CHECK (
  ("locationStreet" IS NOT NULL AND "locationCity" IS NOT NULL AND "locationPostalCode" IS NOT NULL
    AND "locationCountry" IS NOT NULL AND "locationLatitude" IS NOT NULL AND "locationLongitude" IS NOT NULL)
  OR
  ("locationStreet" IS NULL AND "locationCity" IS NULL AND "locationPostalCode" IS NULL
    AND "locationCountry" IS NULL AND "locationLatitude" IS NULL AND "locationLongitude" IS NULL
    AND "locationDistrict" IS NULL AND "locationPlaceName" IS NULL)
);
ALTER TABLE "event" ADD CONSTRAINT "event_online_has_no_location" CHECK ("venueType" <> 'ONLINE' OR "locationCity" IS NULL);
ALTER TABLE "event" ADD CONSTRAINT "event_online_url_only_online" CHECK ("onlineUrl" IS NULL OR "venueType" = 'ONLINE');

-- Participation: pořadník a nabídka
ALTER TABLE "participation" ADD CONSTRAINT "participation_waitlist_position" CHECK (
  ("status" = 'WAITLISTED') = ("waitlistPosition" IS NOT NULL)
);
ALTER TABLE "participation" ADD CONSTRAINT "participation_waitlist_position_positive" CHECK ("waitlistPosition" IS NULL OR "waitlistPosition" >= 1);
ALTER TABLE "participation" ADD CONSTRAINT "participation_invited_has_offer" CHECK ("status" <> 'INVITED' OR "offerExpiresAt" IS NOT NULL);

-- User: dočasná poloha platí do data a naopak; poloměr nesmí být záporný
ALTER TABLE "user" ADD CONSTRAINT "user_temporary_location_valid_until" CHECK (
  ("temporaryCity" IS NOT NULL) = ("temporaryLocationValidUntil" IS NOT NULL)
);
ALTER TABLE "user" ADD CONSTRAINT "user_travel_radius_positive" CHECK ("travelRadiusKm" IS NULL OR "travelRadiusKm" > 0);
