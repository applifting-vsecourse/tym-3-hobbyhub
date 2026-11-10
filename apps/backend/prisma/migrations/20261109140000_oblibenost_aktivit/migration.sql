-- Pořadí oblíbenosti aktivit pro dlaždice v onboardingu (ADR-0020, dodatek).
-- 40 nejoblíbenějších aktivit podle celosvětové obliby, vybraných tak, aby byly
-- zastoupené všechny kategorie. Ostatní aktivity pořadí nemají (NULL) a řadí se
-- za ně podle kategorie a názvu.

-- AlterTable
ALTER TABLE "activity" ADD COLUMN "popularityRank" INTEGER;

ALTER TABLE "activity" ADD CONSTRAINT "activity_popularityRank_positive"
  CHECK ("popularityRank" IS NULL OR "popularityRank" > 0);

UPDATE "activity" a
SET "popularityRank" = r.rank
FROM (VALUES
  ('fotbal', 1),
  ('beh', 2),
  ('posilovna', 3),
  ('plavani', 4),
  ('cyklistika', 5),
  ('tenis', 6),
  ('basketbal', 7),
  ('joga', 8),
  ('volejbal', 9),
  ('turistika', 10),
  ('deskove-hry', 11),
  ('badminton', 12),
  ('sachy', 13),
  ('lezeni', 14),
  ('stolni-tenis', 15),
  ('konzolove-hry', 16),
  ('florbal', 17),
  ('lyzovani', 18),
  ('bowling', 19),
  ('box', 20),
  ('salsa', 21),
  ('pub-kviz', 22),
  ('brusleni', 23),
  ('paddleboard', 24),
  ('golf', 25),
  ('unikove-hry', 26),
  ('cviceni', 27),
  ('squash', 28),
  ('lukostrelba', 29),
  ('karate', 30),
  ('inline-brusleni', 31),
  ('ledni-hokej', 32),
  ('sipky', 33),
  ('zumba', 34),
  ('padel', 35),
  ('karetni-hry', 36),
  ('vodactvi', 37),
  ('beach-volejbal', 38),
  ('tymove-esporty', 39),
  ('pilates', 40)
) AS r(icon, rank)
WHERE a."icon" = r.icon;

-- CreateIndex
CREATE UNIQUE INDEX "activity_popularityRank_key" ON "activity"("popularityRank");
