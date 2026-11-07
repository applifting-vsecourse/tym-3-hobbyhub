-- AlterTable
ALTER TABLE "participation" ADD COLUMN     "cancellationMessage" VARCHAR(500);

-- Not expressible in Prisma (see the note at the top of schema.prisma).

-- F-06.4, ADR-0017: the message belongs to a cancelled seat only. A seat
-- cancelled any other way (none yet) may have none.
ALTER TABLE "participation" ADD CONSTRAINT "participation_cancellation_message_only_cancelled" CHECK ("cancellationMessage" IS NULL OR "status" = 'CANCELLED');

-- At least 10 characters besides the whitespace the API's
-- `String.prototype.trim()` drops (see `f_06_1_zprava_bez_bilych_znaku`); the
-- column caps it at 500. Same limits as `PARTICIPATION_CANCELLATION_MESSAGE_*`.
ALTER TABLE "participation" ADD CONSTRAINT "participation_cancellation_message_length" CHECK (
  "cancellationMessage" IS NULL OR char_length(btrim(
    "cancellationMessage",
    E'\u0009\u000A\u000B\u000C\u000D                  　﻿'
  )) >= 10
);
