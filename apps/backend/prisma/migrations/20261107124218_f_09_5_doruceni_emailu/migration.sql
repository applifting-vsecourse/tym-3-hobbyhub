-- CreateEnum
CREATE TYPE "EmailKind" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EmailSkipReason" AS ENUM ('UNVERIFIED', 'RECIPIENT_CAP');

-- CreateTable
CREATE TABLE "email_delivery" (
    "id" TEXT NOT NULL,
    "kind" "EmailKind" NOT NULL,
    "critical" BOOLEAN NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "toAddress" VARCHAR(320) NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "html" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "notificationId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "skipReason" "EmailSkipReason",
    "providerMessageId" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "email_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_delivery_notificationId_key" ON "email_delivery"("notificationId");

-- CreateIndex
CREATE INDEX "email_delivery_status_nextAttemptAt_idx" ON "email_delivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "email_delivery_sentAt_idx" ON "email_delivery"("sentAt");

-- CreateIndex
CREATE INDEX "email_delivery_recipientId_sentAt_idx" ON "email_delivery"("recipientId", "sentAt");

-- AddForeignKey
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ADR-0018: the same rules as the outbox code, as the last line of defence.
ALTER TABLE "email_delivery"
  ADD CONSTRAINT "email_delivery_attempts_check" CHECK ("attempts" BETWEEN 0 AND 5),
  ADD CONSTRAINT "email_delivery_sent_check" CHECK (("status" = 'SENT') = ("sentAt" IS NOT NULL)),
  ADD CONSTRAINT "email_delivery_skipped_check" CHECK (("status" = 'SKIPPED') = ("skipReason" IS NOT NULL));
