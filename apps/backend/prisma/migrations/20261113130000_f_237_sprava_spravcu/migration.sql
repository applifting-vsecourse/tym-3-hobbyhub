-- #237, ADR-0021: administrators invite and deactivate each other; their
-- e-mails (invitation, password recovery) go through the outbox too.

-- AlterEnum
ALTER TYPE "EmailKind" ADD VALUE 'ADMIN_INVITATION';

-- AlterTable
ALTER TABLE "administrator" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedById" TEXT;

-- AlterTable
ALTER TABLE "email_delivery" ADD COLUMN     "administratorId" TEXT,
ALTER COLUMN "recipientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "administrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrator" ADD CONSTRAINT "administrator_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "administrator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrator" ADD CONSTRAINT "administrator_deactivatedById_fkey" FOREIGN KEY ("deactivatedById") REFERENCES "administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- An e-mail goes to a user or to an administrator, never both, never nobody.
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_one_recipient"
  CHECK (num_nonnulls("recipientId", "administratorId") = 1);

-- Deactivated means deactivated by someone, and never by oneself.
ALTER TABLE "administrator" ADD CONSTRAINT "administrator_deactivation_all_or_nothing"
  CHECK (("deactivatedAt" IS NULL) = ("deactivatedById" IS NULL));
ALTER TABLE "administrator" ADD CONSTRAINT "administrator_not_deactivated_by_self"
  CHECK ("deactivatedById" IS DISTINCT FROM "id");
