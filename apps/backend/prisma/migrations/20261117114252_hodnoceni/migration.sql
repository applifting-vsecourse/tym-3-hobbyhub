-- #236, ADR-0027: vzájemné hodnocení organizátora a účastníka po akci.
-- Hodnocení je vázané na účast (eventId, userId), jedno každým směrem.
-- Skóre se nečte z tabulky, ale z view níže: jediné místo, kde je podmínka
-- odkrytí (konec akce + 7 dní) a hranice 3 hodnocení pro zveřejnění průměru.
-- Obě čísla drží i `src/modules/rating/domain/rating.ts`; hlídá je
-- `rating-schema.spec.ts`.

-- CreateEnum
CREATE TYPE "rating_direction" AS ENUM ('TO_ORGANIZER', 'TO_PARTICIPANT');

-- CreateTable
CREATE TABLE "rating" (
    "id" TEXT NOT NULL,
    "direction" "rating_direction" NOT NULL,
    "stars" SMALLINT NOT NULL,
    "comment" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,

    CONSTRAINT "rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rating_ratedUserId_direction_idx" ON "rating"("ratedUserId", "direction");

-- CreateIndex
CREATE INDEX "rating_authorId_idx" ON "rating"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "rating_eventId_participantId_direction_key" ON "rating"("eventId", "participantId", "direction");

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_eventId_participantId_fkey" FOREIGN KEY ("eventId", "participantId") REFERENCES "participation"("eventId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 1–5 celých hvězdiček.
ALTER TABLE "rating" ADD CONSTRAINT "rating_stars_range"
  CHECK ("stars" BETWEEN 1 AND 5);

-- Komentář je nepovinný, ale ne prázdný.
ALTER TABLE "rating" ADD CONSTRAINT "rating_comment_not_blank"
  CHECK ("comment" IS NULL OR btrim("comment") <> '');

-- Nikdo nehodnotí sám sebe.
ALTER TABLE "rating" ADD CONSTRAINT "rating_not_self"
  CHECK ("authorId" <> "ratedUserId");

-- Účastník je na té straně, kterou určuje směr: autor hodnocení organizátora,
-- hodnocený u hodnocení účastníka.
ALTER TABLE "rating" ADD CONSTRAINT "rating_participant_side"
  CHECK (
    ("direction" = 'TO_ORGANIZER' AND "authorId" = "participantId")
    OR ("direction" = 'TO_PARTICIPANT' AND "ratedUserId" = "participantId")
  );

-- Pro skóre akce a „Moje hodnocení“ podle akce.
CREATE INDEX "rating_eventId_direction_idx" ON "rating"("eventId", "direction");

-- ADR-0027: odkrytá hodnocení. Hodnocení akce se odkryjí všechna najednou,
-- až skončí lhůta (konec akce + 7 dní); do té doby je hodnocený nevidí a do
-- skóre se nepočítají. Nepočítají se ani hodnocení akce, kterou skryl správce
-- nebo která se nakonec neuskutečnila. Prisma ukládá čas v UTC bez časové
-- zóny, proto se porovnává s `now()` v UTC, nezávisle na zóně spojení.
CREATE VIEW "rating_revealed" AS
SELECT r.*
FROM "rating" r
JOIN "event" e ON e."id" = r."eventId"
WHERE e."endAt" + INTERVAL '7 days' < (now() AT TIME ZONE 'UTC')
  AND e."status" IN ('PUBLISHED', 'FINISHED')
  AND NOT e."isHidden";

-- Skóre člověka, zvlášť jako organizátor (TO_ORGANIZER) a jako účastník
-- (TO_PARTICIPANT): prostý průměr odkrytých hodnocení. `publicAverage` je
-- průměr, který smí vidět ostatní: až od 3 hodnocení. Kdo hodnocení nemá,
-- nemá tu řádek (LEFT JOIN + COALESCE).
CREATE VIEW "user_rating_score" AS
SELECT
  "ratedUserId" AS "userId",
  "direction",
  COUNT(*)::integer AS "count",
  AVG("stars")::double precision AS "average",
  CASE WHEN COUNT(*) >= 3 THEN AVG("stars")::double precision END AS "publicAverage"
FROM "rating_revealed"
GROUP BY "ratedUserId", "direction";

-- Skóre akce: hodnocení, která k ní dali účastníci. Skóre skupiny jde
-- spočítat přes event."groupId", až se rozhodne, jak ho počítat.
CREATE VIEW "event_rating_score" AS
SELECT
  "eventId",
  COUNT(*)::integer AS "count",
  AVG("stars")::double precision AS "average",
  CASE WHEN COUNT(*) >= 3 THEN AVG("stars")::double precision END AS "publicAverage"
FROM "rating_revealed"
WHERE "direction" = 'TO_ORGANIZER'
GROUP BY "eventId";
