-- A blank message means the same here as in the API. `btrim` without a second
-- argument strips spaces only, so a message of line breaks or tabs passed this
-- check, while the API's `String.prototype.trim()` drops it as not filled in.
-- The list is exactly what `trim()` strips: ECMAScript WhiteSpace and
-- LineTerminator (tab, LF, VT, FF, CR, space, NBSP, U+1680, U+2000–U+200A,
-- U+2028, U+2029, U+202F, U+205F, U+3000, BOM).
--
-- Length needs no change: `VARCHAR(500)` counts characters (code points), as
-- the API (`CharLength`) and the form do.
ALTER TABLE "participation_request" DROP CONSTRAINT "participation_request_message_not_blank";
ALTER TABLE "participation_request" ADD CONSTRAINT "participation_request_message_not_blank" CHECK (
  "message" IS NULL OR btrim(
    "message",
    E'\u0009\u000A\u000B\u000C\u000D                  　﻿'
  ) <> ''
);
