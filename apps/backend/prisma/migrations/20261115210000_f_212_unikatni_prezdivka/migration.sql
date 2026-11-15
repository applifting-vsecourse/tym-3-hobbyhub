-- #212, ADR-0025: the nickname is unique. BetterAuth's username plugin keeps
-- it in `username` (lower-cased; the unique index "user_username_key" already
-- exists) and `displayUsername` (as typed); `name` is a copy of
-- `displayUsername`. Every existing account gets a nickname here:
--   * a valid username it already has (the seeded accounts) is kept;
--   * anyone else gets one made from the name: diacritics and anything but
--     a-z, 0-9, "_" and "." removed ("Jan Novák" -> "JanNovak"), cut to 30;
--     shorter than 3 characters -> "hrac1";
--   * a taken one gets a number ("JanNovak2"), the older account keeps it.
-- Reserved words are not checked: they apply to newly chosen nicknames only.

-- AlterTable
ALTER TABLE "user" ADD COLUMN "usernameChangedAt" TIMESTAMP(3);

-- Every nickname is assigned anew, so an old username of an account handled
-- later cannot block a candidate of one handled earlier.
ALTER TABLE "user" ADD COLUMN "previousUsername" TEXT;
UPDATE "user"
SET "previousUsername" = "username",
    "username" = NULL,
    "displayUsername" = NULL;

DO $$
DECLARE
  account RECORD;
  base TEXT;
  candidate TEXT;
  n INT;
BEGIN
  FOR account IN
    SELECT "id", "name", "previousUsername"
    FROM "user"
    ORDER BY
      COALESCE("previousUsername" ~ '^[A-Za-z0-9_.]{3,30}$', FALSE) DESC,
      "createdAt",
      "id"
  LOOP
    IF COALESCE(account."previousUsername" ~ '^[A-Za-z0-9_.]{3,30}$', FALSE) THEN
      base := account."previousUsername";
    ELSE
      base := left(
        regexp_replace(
          translate(
            account."name",
            'áàâäãåāăąçćčďđéèêëēěęíìîïīľĺłñńňóòôöõőøōŕřśšşťţúùûüůűūýÿźżžÁÀÂÄÃÅĀĂĄÇĆČĎĐÉÈÊËĒĚĘÍÌÎÏĪĽĹŁÑŃŇÓÒÔÖÕŐØŌŔŘŚŠŞŤŢÚÙÛÜŮŰŪÝŸŹŻŽ',
            'aaaaaaaaacccddeeeeeeeiiiiilllnnnoooooooorrsssttuuuuuuuyyzzzAAAAAAAAACCCDDEEEEEEEIIIIILLLNNNOOOOOOOORRSSSTTUUUUUUUYYZZZ'
          ),
          '[^A-Za-z0-9_.]', '', 'g'
        ),
        30
      );
    END IF;

    n := 1;
    IF length(base) < 3 THEN
      base := 'hrac';
      candidate := 'hrac1';
    ELSE
      candidate := base;
    END IF;

    WHILE EXISTS (SELECT 1 FROM "user" WHERE "username" = lower(candidate)) LOOP
      n := n + 1;
      candidate := left(base, 30 - length(n::TEXT)) || n::TEXT;
    END LOOP;

    UPDATE "user"
    SET "username" = lower(candidate),
        "displayUsername" = candidate,
        "name" = candidate
    WHERE "id" = account."id";
  END LOOP;
END $$;

ALTER TABLE "user" DROP COLUMN "previousUsername";

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "username" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "displayUsername" SET DATA TYPE VARCHAR(30);

-- The same rules as shared/auth/registration/nickname.ts, as the last line of
-- defence. Null only for accounts not made by sign-up.
ALTER TABLE "user" ADD CONSTRAINT "user_username_format"
  CHECK ("username" ~ '^[a-z0-9_.]{3,30}$');
ALTER TABLE "user" ADD CONSTRAINT "user_display_username_matches"
  CHECK (
    ("username" IS NULL AND "displayUsername" IS NULL)
    OR COALESCE(lower("displayUsername") = "username", FALSE)
  );
ALTER TABLE "user" ADD CONSTRAINT "user_name_is_display_username"
  CHECK ("displayUsername" IS NULL OR "name" = "displayUsername");
