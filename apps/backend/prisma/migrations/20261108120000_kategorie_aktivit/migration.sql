-- Hlavní kategorie aktivit (ADR-0019, Story „Kategorie aktivit 1/3“).
-- Sport / Hry / Ostatní nahradí 14 kategorií s ikonou a pořadím, 16 stávajících
-- aktivit se do nich přesune (stejné id, akce, skupiny ani zájmy se nemění)
-- a přibude 82 nových aktivit. Všechny inserty jsou idempotentní.

-- AlterTable: sloupce nejdřív volitelné, NOT NULL až po naplnění.
ALTER TABLE "activity_category" ADD COLUMN "icon" VARCHAR(50),
ADD COLUMN "order" INTEGER;

-- Kategorie. „Ostatní“ už existuje, jen dostane ikonu a pořadí.
INSERT INTO "activity_category" ("id", "name", "icon", "order")
VALUES
  (gen_random_uuid()::text, 'Míčové sporty',          'micove-sporty',          1),
  (gen_random_uuid()::text, 'Raketové sporty',        'raketove-sporty',        2),
  (gen_random_uuid()::text, 'Přesnost a míření',      'presnost',               3),
  (gen_random_uuid()::text, 'Zimní a ledové sporty',  'zimni-sporty',           4),
  (gen_random_uuid()::text, 'Tanec',                  'tanec',                  5),
  (gen_random_uuid()::text, 'Fitness a cvičení',      'fitness',                6),
  (gen_random_uuid()::text, 'Běh a kolo',             'beh-a-kolo',             7),
  (gen_random_uuid()::text, 'Outdoor a příroda',      'outdoor',                8),
  (gen_random_uuid()::text, 'Vodní sporty',           'vodni-sporty',           9),
  (gen_random_uuid()::text, 'Bojové sporty',          'bojove-sporty',         10),
  (gen_random_uuid()::text, 'Deskové a karetní hry',  'deskove-a-karetni-hry', 11),
  (gen_random_uuid()::text, 'Videohry a e-sport',     'videohry',              12),
  (gen_random_uuid()::text, 'Kvízy a hry v terénu',   'kvizy-a-terenni-hry',   13),
  (gen_random_uuid()::text, 'Ostatní',                'ostatni',               14)
ON CONFLICT ("name") DO UPDATE SET "icon" = EXCLUDED."icon", "order" = EXCLUDED."order";

-- Stávající aktivity do nových kategorií, podle klíče ikony.
UPDATE "activity" a
SET "categoryId" = c."id"
FROM (VALUES
  ('fotbal',       'micove-sporty'),
  ('florbal',      'micove-sporty'),
  ('volejbal',     'micove-sporty'),
  ('basketbal',    'micove-sporty'),
  ('tenis',        'raketove-sporty'),
  ('badminton',    'raketove-sporty'),
  ('stolni-tenis', 'raketove-sporty'),
  ('cviceni',      'fitness'),
  ('beh',          'beh-a-kolo'),
  ('cyklistika',   'beh-a-kolo'),
  ('turistika',    'outdoor'),
  ('plavani',      'vodni-sporty'),
  ('deskove-hry',  'deskove-a-karetni-hry'),
  ('sachy',        'deskove-a-karetni-hry'),
  ('lan-party',    'videohry'),
  ('ostatni',      'ostatni')
) AS m(activity_icon, category_icon)
JOIN "activity_category" c ON c."icon" = m.category_icon
WHERE a."icon" = m.activity_icon;

-- Nové aktivity. "icon" je jedinečný klíč aktivity ve frontendu (ikona + překlad);
-- aktivita bez vlastní kresby tam dostane ikonu své kategorie.
INSERT INTO "activity" ("id", "categoryId", "name", "icon", "defaultMinParticipants", "defaultMaxParticipants")
SELECT gen_random_uuid()::text, c."id", a.name, a.icon, a.min, a.max
FROM (VALUES
  ('micove-sporty',         'Futsal',                      'futsal',              8, 12),
  ('micove-sporty',         'Beach volejbal',              'beach-volejbal',      4,  8),
  ('micove-sporty',         'Házená',                      'hazena',             10, 16),
  ('micove-sporty',         'Nohejbal',                    'nohejbal',            4,  6),
  ('micove-sporty',         'Ragby',                       'ragby',              14, 30),
  ('micove-sporty',         'Baseball a softbal',          'baseball',           14, 20),
  ('micove-sporty',         'Ultimate frisbee',            'ultimate-frisbee',   10, 14),
  ('raketove-sporty',       'Squash',                      'squash',              2,  4),
  ('raketove-sporty',       'Padel',                       'padel',               4,  4),
  ('raketove-sporty',       'Pickleball',                  'pickleball',          2,  4),
  ('raketove-sporty',       'Speedminton',                 'speedminton',         2,  4),
  ('presnost',              'Lukostřelba',                 'lukostrelba',         2, 10),
  ('presnost',              'Sportovní střelba',           'sportovni-strelba',   2, 10),
  ('presnost',              'Šipky',                       'sipky',               2,  8),
  ('presnost',              'Bowling',                     'bowling',             2, 12),
  ('presnost',              'Kuželky',                     'kuzelky',             2,  8),
  ('presnost',              'Golf',                        'golf',                2,  4),
  ('presnost',              'Discgolf',                    'discgolf',            2,  8),
  ('presnost',              'Pétanque',                    'petanque',            2,  6),
  ('presnost',              'Kulečník',                    'kulecnik',            2,  4),
  ('presnost',              'Curling',                     'curling',             8,  8),
  ('zimni-sporty',          'Krasobruslení',               'krasobrusleni',       2, 10),
  ('zimni-sporty',          'Bruslení',                    'brusleni',            2, 15),
  ('zimni-sporty',          'Lední hokej',                 'ledni-hokej',        10, 22),
  ('zimni-sporty',          'Lyžování',                    'lyzovani',            2, 10),
  ('zimni-sporty',          'Snowboarding',                'snowboarding',        2, 10),
  ('zimni-sporty',          'Běžky',                       'bezky',               2, 10),
  ('zimni-sporty',          'Skialpinismus',               'skialpinismus',       2,  8),
  ('tanec',                 'Salsa',                       'salsa',               2, 20),
  ('tanec',                 'Bachata',                     'bachata',             2, 20),
  ('tanec',                 'Swing',                       'swing',               2, 20),
  ('tanec',                 'Standardní a latinské tance', 'standardni-tance',    2, 20),
  ('tanec',                 'Street dance a hip hop',      'street-dance',        2, 20),
  ('tanec',                 'Zumba',                       'zumba',               3, 20),
  ('tanec',                 'Lidové tance',                'lidove-tance',        4, 20),
  ('fitness',               'Posilovna',                   'posilovna',           2,  6),
  ('fitness',               'Jóga',                        'joga',                2, 15),
  ('fitness',               'Pilates',                     'pilates',             2, 15),
  ('fitness',               'CrossFit',                    'crossfit',            2, 12),
  ('fitness',               'Kalistenika',                 'kalistenika',         2, 10),
  ('fitness',               'Kruhový trénink',             'kruhovy-trenink',     3, 15),
  ('beh-a-kolo',            'Horská kola',                 'horska-kola',         2, 10),
  ('beh-a-kolo',            'Inline bruslení',             'inline-brusleni',     2, 15),
  ('beh-a-kolo',            'Triatlon',                    'triatlon',            2, 10),
  ('beh-a-kolo',            'Nordic walking',              'nordic-walking',      2, 15),
  ('outdoor',               'Lezení a bouldering',         'lezeni',              2,  8),
  ('outdoor',               'Horolezectví',                'horolezectvi',        2,  6),
  ('outdoor',               'Orientační běh',              'orientacni-beh',      2, 20),
  ('outdoor',               'Geocaching',                  'geocaching',          2, 10),
  ('outdoor',               'Kempování',                   'kempovani',           2, 15),
  ('vodni-sporty',          'Paddleboard',                 'paddleboard',         2, 10),
  ('vodni-sporty',          'Vodáctví a kanoe',            'vodactvi',            2, 12),
  ('vodni-sporty',          'Veslování',                   'veslovani',           2,  8),
  ('vodni-sporty',          'Potápění',                    'potapeni',            2,  8),
  ('vodni-sporty',          'Wakeboard a surf',            'wakeboard',           2,  8),
  ('vodni-sporty',          'Vodní pólo',                  'vodni-polo',         10, 14),
  ('bojove-sporty',         'Box',                         'box',                 2, 12),
  ('bojove-sporty',         'Judo',                        'judo',                2, 12),
  ('bojove-sporty',         'Karate',                      'karate',              2, 12),
  ('bojove-sporty',         'Brazilské jiu-jitsu',         'jiu-jitsu',           2, 12),
  ('bojove-sporty',         'Thajský box',                 'thajsky-box',         2, 12),
  ('bojove-sporty',         'Šerm',                        'serm',                2, 10),
  ('bojove-sporty',         'Krav maga',                   'krav-maga',           2, 12),
  ('deskove-a-karetni-hry', 'Go',                          'go',                  2,  2),
  ('deskove-a-karetni-hry', 'Karetní hry',                 'karetni-hry',         2,  6),
  ('deskove-a-karetni-hry', 'Mariáš',                      'marias',              3,  4),
  ('deskove-a-karetni-hry', 'Bridž',                       'bridz',               4,  4),
  ('deskove-a-karetni-hry', 'Stolní RPG',                  'stolni-rpg',          3,  6),
  ('deskove-a-karetni-hry', 'Wargaming',                   'wargaming',           2,  4),
  ('videohry',              'Konzolové hry',               'konzolove-hry',       2,  8),
  ('videohry',              'Týmové e-sporty',             'tymove-esporty',      5, 10),
  ('videohry',              'Strategie',                   'strategie',           2,  8),
  ('videohry',              'VR hry',                      'vr-hry',              2,  6),
  ('videohry',              'Závodní simulátory',          'zavodni-simulatory',  2,  8),
  ('videohry',              'Retro hraní',                 'retro-hrani',         2,  8),
  ('kvizy-a-terenni-hry',   'Pub kvíz',                    'pub-kviz',            2,  6),
  ('kvizy-a-terenni-hry',   'Únikové hry',                 'unikove-hry',         2,  6),
  ('kvizy-a-terenni-hry',   'Šifrovačky',                  'sifrovacky',          2,  6),
  ('kvizy-a-terenni-hry',   'Laser game',                  'laser-game',          4, 20),
  ('kvizy-a-terenni-hry',   'Paintball',                   'paintball',           6, 20),
  ('kvizy-a-terenni-hry',   'Airsoft',                     'airsoft',             6, 30),
  ('kvizy-a-terenni-hry',   'LARP',                        'larp',                5, 40)
) AS a(category, name, icon, min, max)
JOIN "activity_category" c ON c."icon" = a.category
ON CONFLICT ("name") DO NOTHING;

-- Staré kategorie zaniknou, jen pokud už pod nimi nic není (žádná aktivita se neztratí).
DELETE FROM "activity_category" c
WHERE c."name" IN ('Sport', 'Hry')
  AND NOT EXISTS (SELECT 1 FROM "activity" a WHERE a."categoryId" = c."id");

-- Kategorie mimo číselník (přidané ručně, nebo Sport/Hry s ručně přidanou aktivitou)
-- dostanou neznámý klíč ikony a pořadí za koncem, jinak by NOT NULL níže selhal.
-- Frontend neznámý klíč zobrazí bez ikony s názvem z databáze.
UPDATE "activity_category" c
SET "icon" = COALESCE(c."icon", 'neznama-' || c."id"),
    "order" = COALESCE(c."order", 100 + sub.rn)
FROM (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "name") AS rn
  FROM "activity_category"
  WHERE "icon" IS NULL OR "order" IS NULL
) sub
WHERE c."id" = sub."id";

ALTER TABLE "activity_category" ALTER COLUMN "icon" SET NOT NULL,
ALTER COLUMN "order" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "activity_category_icon_key" ON "activity_category"("icon");

-- CreateIndex
CREATE UNIQUE INDEX "activity_category_order_key" ON "activity_category"("order");
