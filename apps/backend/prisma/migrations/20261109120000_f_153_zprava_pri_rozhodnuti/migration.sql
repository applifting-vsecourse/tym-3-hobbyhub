-- #153, ADR-0019: the organizer's or the admins' words go with an approval
-- too, so the rejection reason becomes the message of the decision. Renamed,
-- not dropped: the reasons written so far stay.
ALTER TABLE "participation_request" RENAME COLUMN "rejectionReason" TO "decisionMessage";
ALTER TABLE "membership_request" RENAME COLUMN "rejectionReason" TO "decisionMessage";

-- Not expressible in Prisma (see the note at the top of schema.prisma).

-- ADR-0019: the message belongs to a decision, approval or rejection; a
-- request that was withdrawn or closed had none.
ALTER TABLE "participation_request" DROP CONSTRAINT "participation_request_rejection_reason_only_rejected";
ALTER TABLE "participation_request" ADD CONSTRAINT "participation_request_decision_message_only_decided" CHECK ("decisionMessage" IS NULL OR "status" IN ('APPROVED', 'REJECTED'));
ALTER TABLE "membership_request" DROP CONSTRAINT "membership_request_rejection_reason_only_rejected";
ALTER TABLE "membership_request" ADD CONSTRAINT "membership_request_decision_message_only_decided" CHECK ("decisionMessage" IS NULL OR "status" IN ('APPROVED', 'REJECTED'));

-- Optional, but never blank, as before. Renaming the column carried the
-- check along; only its name follows.
ALTER TABLE "participation_request" RENAME CONSTRAINT "participation_request_rejection_reason_not_blank" TO "participation_request_decision_message_not_blank";
ALTER TABLE "membership_request" RENAME CONSTRAINT "membership_request_rejection_reason_not_blank" TO "membership_request_decision_message_not_blank";
