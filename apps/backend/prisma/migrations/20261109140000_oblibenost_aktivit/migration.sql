-- Pořadí oblíbenosti aktivit pro dlaždice v onboardingu (ADR-0020, dodatek).
-- 40 nejoblíbenějších aktivit podle celosvětové obliby, vybraných tak, aby byly
-- zastoupené všechny kategorie. Ostatní aktivity pořadí nemají (NULL) a řadí se
-- za ně podle kategorie a názvu.

-- AlterTable
ALTER TABLE "activity" ADD COLUMN "popularityRank" INTEGER;

ALTER TABLE "activity" ADD CONSTRAINT "activity_popularityRank_positive"
  CHECK ("popularityRank" IS NULL OR "popularityRank" > 0);

-- Páruje se podle názvu: ten je jedinečný, klíč ikony ne. Dvě aktivity se
-- stejnou ikonou by jinak dostaly stejné pořadí a jedinečný index níže by spadl.
UPDATE "activity" a
SET "popularityRank" = r.rank
FROM (VALUES
  ('Fotbal', 1),
  ('Běh', 2),
  ('Posilovna', 3),
  ('Plavání', 4),
  ('Cyklistika', 5),
  ('Tenis', 6),
  ('Basketbal', 7),
  ('Jóga', 8),
  ('Volejbal', 9),
  ('Turistika', 10),
  ('Deskové hry', 11),
  ('Badminton', 12),
  ('Šachy', 13),
  ('Lezení a bouldering', 14),
  ('Stolní tenis', 15),
  ('Konzolové hry', 16),
  ('Florbal', 17),
  ('Lyžování', 18),
  ('Bowling', 19),
  ('Box', 20),
  ('Salsa', 21),
  ('Pub kvíz', 22),
  ('Bruslení', 23),
  ('Paddleboard', 24),
  ('Golf', 25),
  ('Únikové hry', 26),
  ('Cvičení', 27),
  ('Squash', 28),
  ('Lukostřelba', 29),
  ('Karate', 30),
  ('Inline bruslení', 31),
  ('Lední hokej', 32),
  ('Šipky', 33),
  ('Zumba', 34),
  ('Padel', 35),
  ('Karetní hry', 36),
  ('Vodáctví a kanoe', 37),
  ('Beach volejbal', 38),
  ('Týmové e-sporty', 39),
  ('Pilates', 40)
) AS r(name, rank)
WHERE a."name" = r.name;

-- CreateIndex
CREATE UNIQUE INDEX "activity_popularityRank_key" ON "activity"("popularityRank");
