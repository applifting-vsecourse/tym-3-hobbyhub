-- AlterTable
ALTER TABLE "user" ADD COLUMN     "declaredCity" VARCHAR(100),
ADD COLUMN     "declaredStreet" VARCHAR(200),
ADD COLUMN     "onboardingStepsDone" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "level" ADD COLUMN     "isSkillLevel" BOOLEAN NOT NULL DEFAULT true;

-- "Všechny úrovně" describes an event, not how well a person plays.
UPDATE "level" SET "isSkillLevel" = false WHERE "name" = 'Všechny úrovně';

-- CreateTable
CREATE TABLE "user_activity" (
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "levelId" TEXT,

    CONSTRAINT "user_activity_pkey" PRIMARY KEY ("userId","activityId")
);

-- CreateIndex
CREATE INDEX "user_activity_activityId_idx" ON "user_activity"("activityId");

-- CreateIndex
CREATE INDEX "user_activity_levelId_idx" ON "user_activity"("levelId");

-- AddForeignKey
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity" ADD CONSTRAINT "user_activity_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Limits of the onboarding fields, in step with domain/onboarding.ts
ALTER TABLE "user" ADD CONSTRAINT "user_bio_length" CHECK ("bio" IS NULL OR char_length("bio") <= 300);
ALTER TABLE "user" ADD CONSTRAINT "user_travel_radius_range" CHECK ("travelRadiusKm" IS NULL OR "travelRadiusKm" BETWEEN 5 AND 100);
ALTER TABLE "user" ADD CONSTRAINT "user_onboarding_steps_done_range" CHECK ("onboardingStepsDone" BETWEEN 0 AND 3);
