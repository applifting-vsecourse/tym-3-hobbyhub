-- CreateEnum
CREATE TYPE "group_visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "group_status" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "group_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "group" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" TEXT NOT NULL,
    "locationName" VARCHAR(100),
    "usualSchedule" VARCHAR(100),
    "visibility" "group_visibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "group_status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activityId" TEXT NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_membership" (
    "id" TEXT NOT NULL,
    "role" "group_role" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "group_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_activityId_idx" ON "group"("activityId");

-- CreateIndex
CREATE INDEX "group_membership_userId_idx" ON "group_membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "group_membership_groupId_userId_key" ON "group_membership"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "group_membership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_membership" ADD CONSTRAINT "group_membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Not expressible in Prisma (see the note at the top of schema.prisma).

-- A group has exactly one OWNER: at most one here, at least one because the
-- group and its owner's membership are created in one transaction.
CREATE UNIQUE INDEX "group_membership_one_owner_key" ON "group_membership"("groupId") WHERE "role" = 'OWNER';

-- Same limits as the API: name 3–80 characters, description not blank.
ALTER TABLE "group" ADD CONSTRAINT "group_name_length" CHECK (char_length(btrim("name")) BETWEEN 3 AND 80);
ALTER TABLE "group" ADD CONSTRAINT "group_description_not_blank" CHECK (btrim("description") <> '');
