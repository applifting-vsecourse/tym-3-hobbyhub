-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CLOSED');

-- CreateTable
CREATE TABLE "participation_request" (
    "id" TEXT NOT NULL,
    "status" "request_status" NOT NULL DEFAULT 'PENDING',
    "message" VARCHAR(500),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "participation_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participation_request_eventId_status_idx" ON "participation_request"("eventId", "status");

-- CreateIndex
CREATE INDEX "participation_request_userId_idx" ON "participation_request"("userId");

-- AddForeignKey
ALTER TABLE "participation_request" ADD CONSTRAINT "participation_request_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_request" ADD CONSTRAINT "participation_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Not expressible in Prisma (see the note at the top of schema.prisma).

-- One active request per person and event (F-06.1). Ended requests stay as
-- history, so a withdrawn applicant can ask again.
CREATE UNIQUE INDEX "participation_request_one_pending_key" ON "participation_request"("eventId", "userId") WHERE "status" = 'PENDING';

-- Same limits as the API: the message is optional, but never blank.
ALTER TABLE "participation_request" ADD CONSTRAINT "participation_request_message_not_blank" CHECK ("message" IS NULL OR btrim("message") <> '');

-- ADR-0008: a pending request has no decision yet; every other one has.
ALTER TABLE "participation_request" ADD CONSTRAINT "participation_request_decided_at_with_status" CHECK (("status" = 'PENDING') = ("decidedAt" IS NULL));
