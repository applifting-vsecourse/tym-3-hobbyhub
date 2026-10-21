-- Číselníky (ADR-0002, F-13.5): výchozí kategorie aktivit, aktivity, úrovně
-- a důvody zrušení. Produkce jen migruje, neseeduje (README › Deployment),
-- takže bez tohoto souboru tam není z čeho vybrat aktivitu a akci nejde
-- založit.
--
-- Stejné názvy, ikony a výchozí počty jako v seedu
-- (src/scripts/seed/seed/seed-events.ts), který je upsertuje podle "name".
-- ON CONFLICT na unikátním "name" proto řádek přeskočí, ať už přišel ze seedu
-- dřív, nebo migrace běží znovu: nic se nezdvojí.

INSERT INTO "activity_category" ("id", "name")
VALUES
  (gen_random_uuid()::text, 'Sport'),
  (gen_random_uuid()::text, 'Hry'),
  (gen_random_uuid()::text, 'Ostatní')
ON CONFLICT ("name") DO NOTHING;

-- "icon" je klíč ikony ve frontendu (ACTIVITIES v ActivityIcon.tsx).
INSERT INTO "activity" ("id", "categoryId", "name", "icon", "defaultMinParticipants", "defaultMaxParticipants")
SELECT gen_random_uuid()::text, c."id", a.name, a.icon, a.min, a.max
FROM (VALUES
  ('Sport',   'Florbal',      'florbal',      8,  12),
  ('Sport',   'Volejbal',     'volejbal',     6,  12),
  ('Sport',   'Tenis',        'tenis',        2,   4),
  ('Sport',   'Fotbal',       'fotbal',      10,  22),
  ('Sport',   'Basketbal',    'basketbal',    6,  10),
  ('Sport',   'Badminton',    'badminton',    2,   4),
  ('Sport',   'Stolní tenis', 'stolni-tenis', 2,   4),
  ('Sport',   'Běh',          'beh',          2,  20),
  ('Sport',   'Cyklistika',   'cyklistika',   2,  15),
  ('Sport',   'Plavání',      'plavani',      2,  10),
  ('Sport',   'Cvičení',      'cviceni',      3,  15),
  ('Sport',   'Turistika',    'turistika',    2,  15),
  ('Hry',     'Deskové hry',  'deskove-hry',  3,   8),
  ('Hry',     'Šachy',        'sachy',        2,   2),
  ('Hry',     'LAN party',    'lan-party',    4,  16),
  ('Ostatní', 'Ostatní',      'ostatni',      2,  20)
) AS a(category, name, icon, min, max)
JOIN "activity_category" c ON c."name" = a.category
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "level" ("id", "name", "order")
VALUES
  (gen_random_uuid()::text, 'Začátečníci',     1),
  (gen_random_uuid()::text, 'Mírně pokročilí', 2),
  (gen_random_uuid()::text, 'Pokročilí',       3),
  (gen_random_uuid()::text, 'Všechny úrovně',  4)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "cancellation_reason" ("id", "name")
VALUES
  (gen_random_uuid()::text, 'Málo přihlášených'),
  (gen_random_uuid()::text, 'Nepříznivé počasí'),
  (gen_random_uuid()::text, 'Nedostupné místo'),
  (gen_random_uuid()::text, 'Nemoc organizátora'),
  (gen_random_uuid()::text, 'Jiný důvod')
ON CONFLICT ("name") DO NOTHING;
