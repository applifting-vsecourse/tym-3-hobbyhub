-- Testovací obsah pro sprint review 2. Produkce jen migruje, k databázi nemáme
-- přístup, proto data přicházejí migrací jako v `testovaci_data`. Ta už na
-- produkci zastarala: termíny se počítaly od 20. 10., v seznamu akcí z nich
-- zbyla jediná, a všechno organizuje první registrovaný uživatel, ne tým.
--
-- Migrace proto nejdřív smaže všechno s id `demo-` (akce a skupiny; účasti,
-- žádosti a členství padnou kaskádou) a vloží nový obsah se stejným prefixem,
-- aby šel zase poznat a smazat.
--
-- Lidé podle e-mailu, aby měl každý testovací účet svou roli v ukázce:
--   kruj08@vse.cz             organizuje všechny akce, vlastní všechny skupiny
--   kruj08+lebron@vse.cz      na Florbalu v Kobylisích ani ve skupině Florbal
--                             Kobylisy nic nemá: přihlásí se tam živě
--   kruj08+krupickova@vse.cz  čekající žádosti, které organizátor vyřídí
--   kruj08+paolaegonu@vse.cz  stálá účastnice, adminka skupiny Florbal Kobylisy
-- Ostatní aktivní uživatelé (x1, x2, … v pořadí registrace) jen doplní
-- soupisky a skupiny; kdo neexistuje, místo nechá volné.
--
-- Bez účtu kruj08@vse.cz (CI, lokální databáze) migrace nic nesmaže ani
-- nevloží.
--
-- Termíny: nejbližší daný den v týdnu po dni nasazení (čtvrteční florbal je ve
-- čtvrtek), v čase Europe/Prague, uložené v UTC, jak je Prisma čte. Nikdy ne v
-- den nasazení, aby akce nezačala dřív, než se ukáže.
--
-- Stejně jako v aplikaci: organizátor na své akci nesedí (createPublishedEvent
-- mu účast nezakládá) a účast na akci s ručním schvalováním vzniká schválením
-- žádosti, takže každá má za sebou schválenou žádost.
--
-- Prisma migraci nespouští v jedné transakci: když selže pozdější příkaz,
-- dřívější zůstanou zapsané (staré demo smazané, nové napůl vložené). Obsah se
-- proto vymění celý, nebo vůbec.

BEGIN;

CREATE TEMP TABLE demo_people AS
SELECT u."id", c.who
FROM (VALUES
  ('kruj08@vse.cz', 'me'),
  ('kruj08+lebron@vse.cz', 'lebron'),
  ('kruj08+krupickova@vse.cz', 'krupickova'),
  ('kruj08+paolaegonu@vse.cz', 'paola')
) AS c(email, who)
JOIN "user" u ON lower(u."email") = c.email
UNION ALL
SELECT u."id", 'x' || row_number() OVER (ORDER BY u."createdAt", u."id")
FROM "user" u
WHERE u."role" = 'user' AND u."status" = 'ACTIVE'
  AND lower(u."email") NOT IN (
    'kruj08@vse.cz', 'kruj08+lebron@vse.cz',
    'kruj08+krupickova@vse.cz', 'kruj08+paolaegonu@vse.cz'
  );

CREATE TEMP TABLE demo_clock AS
SELECT
  (now() AT TIME ZONE 'UTC') AS utc_now,
  -- Local midnight in Prague, without a zone. The offset is added here, in
  -- local time, and only the result is converted to UTC, so "19:00" stays
  -- 19:00 on the other side of a daylight-saving change.
  date_trunc('day', now() AT TIME ZONE 'Europe/Prague') AS local_midnight;

-- Úklid --------------------------------------------------------------------

DELETE FROM "event"
WHERE "id" LIKE 'demo-%'
  AND EXISTS (SELECT 1 FROM demo_people WHERE who = 'me');

DELETE FROM "group"
WHERE "id" LIKE 'demo-%'
  AND EXISTS (SELECT 1 FROM demo_people WHERE who = 'me');

-- Skupiny ------------------------------------------------------------------

INSERT INTO "group" (
  "id", "name", "description", "locationName", "usualSchedule",
  "visibility", "status", "activityId", "createdAt", "updatedAt"
)
SELECT
  'demo-group-' || g.slug, g.name, g.description, g.location_name, g.usual_schedule,
  'PUBLIC'::"group_visibility", 'ACTIVE'::"group_status", a."id",
  c.utc_now - make_interval(days => g.age_days),
  c.utc_now - make_interval(days => g.age_days)
FROM (VALUES
  (
    'florbal-kobylisy', 'Florbal Kobylisy',
    'Florbal pro radost každý čtvrtek v tělocvičně ZŠ Kobylisy. Hrajeme smíšeně, na úrovni nezáleží, důležitá je férovost a dobrá nálada. Po hře často zajdeme na pivo.',
    'Florbal', 'Praha 8 – Kobylisy', 'Čtvrtek 19:00', 60
  ),
  (
    'volejbal-letna', 'Volejbal na Letné',
    'Smíšený volejbal na Letné od jara do podzimu, v zimě se přesouváme do haly. Začátečníky rádi zaučíme.',
    'Volejbal', 'Praha 7 – Letná', 'Sobota dopoledne', 45
  ),
  (
    'deskovkari-karlin', 'Deskovkáři z Karlína',
    'Scházíme se v herně Kostka a hrajeme všechno od Carcassonne po Twilight Imperium. Hry máme, nováčky naučíme.',
    'Deskové hry', 'Praha 8 – Karlín', 'Úterý večer', 30
  ),
  (
    'bezci-stromovka', 'Běžci ze Stromovky',
    'Nedělní běhy v pohodovém tempu, většinou 8 až 12 km. Jednou za měsíc dáváme delší trasu.',
    'Běh', 'Praha 7 – Holešovice', 'Neděle 9:00', 21
  ),
  (
    'badminton-brevnov', 'Badminton Břevnov',
    'Pravidelný badminton ve Sportcentru Břevnov. Kurty máme zamluvené na celou sezónu, hledáme hráče do čtyřhry.',
    'Badminton', 'Praha 6 – Břevnov', 'Pátek 17:30', 14
  )
) AS g(slug, name, description, activity, location_name, usual_schedule, age_days)
JOIN "activity" a ON a."name" = g.activity
JOIN demo_people me ON me.who = 'me'
CROSS JOIN demo_clock c
ON CONFLICT DO NOTHING;

-- Členství: právě jeden OWNER na skupinu (partial unique index v migraci
-- `group`). Přidávali se postupně, zakladatel první.

INSERT INTO "group_membership" ("id", "role", "joinedAt", "groupId", "userId")
SELECT
  'demo-membership-' || m.slug || '-' || m.who,
  m.role,
  g."createdAt" + make_interval(
    days => 4 * (row_number() OVER (PARTITION BY m.slug ORDER BY m.role, m.who) - 1)::int
  ),
  g."id", p."id"
FROM (VALUES
  ('florbal-kobylisy',  'me',         'OWNER'::"group_role"),
  ('florbal-kobylisy',  'paola',      'ADMIN'),
  ('florbal-kobylisy',  'x1',         'MEMBER'),
  ('florbal-kobylisy',  'x2',         'MEMBER'),
  ('florbal-kobylisy',  'x3',         'MEMBER'),
  ('florbal-kobylisy',  'x4',         'MEMBER'),
  ('volejbal-letna',    'me',         'OWNER'),
  ('volejbal-letna',    'krupickova', 'ADMIN'),
  ('volejbal-letna',    'paola',      'MEMBER'),
  ('volejbal-letna',    'x2',         'MEMBER'),
  ('volejbal-letna',    'x3',         'MEMBER'),
  ('deskovkari-karlin', 'me',         'OWNER'),
  ('deskovkari-karlin', 'lebron',     'MEMBER'),
  ('deskovkari-karlin', 'x1',         'MEMBER'),
  ('deskovkari-karlin', 'x4',         'MEMBER'),
  ('bezci-stromovka',   'me',         'OWNER'),
  ('bezci-stromovka',   'krupickova', 'MEMBER'),
  ('bezci-stromovka',   'x2',         'MEMBER'),
  ('bezci-stromovka',   'x5',         'MEMBER'),
  ('badminton-brevnov', 'me',         'OWNER'),
  ('badminton-brevnov', 'paola',      'MEMBER'),
  ('badminton-brevnov', 'x5',         'MEMBER')
) AS m(slug, who, role)
JOIN "group" g ON g."id" = 'demo-group-' || m.slug
JOIN demo_people p ON p.who = m.who
ON CONFLICT DO NOTHING;

-- Čekající žádosti o členství pro správu skupiny (F-07.3).

INSERT INTO "membership_request" ("id", "status", "message", "requestedAt", "groupId", "userId")
SELECT
  'demo-membership-request-' || r.slug || '-' || r.who,
  'PENDING'::"request_status", r.message,
  c.utc_now - make_interval(hours => r.hours_ago),
  g."id", p."id"
FROM (VALUES
  ('florbal-kobylisy',  'krupickova', 'Ahoj, hledám pravidelnou florbalovou partu blízko Kobylis. Můžu se přidat?', 2),
  ('deskovkari-karlin', 'paola',      'Ráda bych se přidala, nejradši hraju kooperativní hry.', 20)
) AS r(slug, who, message, hours_ago)
JOIN "group" g ON g."id" = 'demo-group-' || r.slug
JOIN demo_people p ON p.who = r.who
CROSS JOIN demo_clock c
ON CONFLICT DO NOTHING;

-- Akce ---------------------------------------------------------------------
--
-- weekday: ISO den v týdnu (1 = pondělí), nth: kolikátý takový den po dni
-- nasazení, duration: délka v minutách, age_days: před kolika dny vznikla.

INSERT INTO "event" (
  "id", "title", "description", "equipment", "imageUrl",
  "status", "visibility", "approvalMode", "venueType",
  "startAt", "endAt", "publishedAt",
  "minParticipants", "maxParticipants", "externalOccupiedSpots",
  "contributionAmount", "contributionNote",
  "locationStreet", "locationCity", "locationPostalCode", "locationCountry",
  "locationDistrict", "locationPlaceName", "locationLatitude", "locationLongitude",
  "activityId", "levelId", "organizerId", "groupId", "createdAt", "updatedAt"
)
SELECT
  'demo-event-' || r.slug, r.title, r.description, r.equipment, r.image_url,
  'PUBLISHED'::"event_status", 'PUBLIC'::"event_visibility",
  'MANUAL'::"approval_mode", 'PUBLIC_VENUE'::"venue_type",
  r.start_at, r.start_at + make_interval(mins => r.duration), r.created_at,
  r.min, r.max, r.external,
  r.contribution, r.contribution_note,
  r.street, 'Praha', r.postal_code, 'Česko',
  r.district, r.place_name, r.latitude, r.longitude,
  a."id", l."id", me."id", g."id", r.created_at, r.created_at
FROM (
  SELECT
    v.*,
    c.utc_now - make_interval(days => v.age_days) AS created_at,
    ((c.local_midnight + make_interval(
        days => (v.weekday - extract(isodow FROM c.local_midnight)::int + 6) % 7 + 1 + 7 * (v.nth - 1),
        hours => v.hour,
        mins => v.minute
      )) AT TIME ZONE 'Europe/Prague') AT TIME ZONE 'UTC' AS start_at
  FROM (VALUES
    (
      'florbal-kobylisy', 'Florbal v Kobylisích',
      'Pravidelný čtvrteční florbal v tělocvičně ZŠ Kobylisy. Hrajeme na dvě třetiny hřiště, střídáme se po pěti minutách a skóre si moc nepočítáme. Ještě nám chybí pár lidí, aby se dalo střídat ve dvou pětkách.',
      'Hokejka a sálová obuv. Dresy obou barev máme.'::text,
      'https://commons.wikimedia.org/wiki/Special:FilePath/V%C3%A4xj%C3%B6_-_UHC_floorball_face-off.jpg?width=800',
      'Florbal', 'Mírně pokročilí'::text, 'florbal-kobylisy'::text,
      4, 1, 19, 0, 120, 8, 12, 2, 80::numeric, 'platí se na místě, za pronájem tělocvičny'::text,
      'ZŠ Kobylisy', 'Chabařovická 1', '18200', 'Praha 8', 50.1297::numeric, 14.4421::numeric, 4
    ),
    (
      'volejbal-letna', 'Volejbal na Letné',
      'Smíšený volejbal na hřišti na Letné. Začátečníci jsou vítaní, pravidla vysvětlíme a týmy losujeme. Když bude pršet, dáme vědět den předem.',
      'Sportovní oblečení a pití, míče máme.',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Volleyball_match_-_warming_up_2.jpg?width=800',
      'Volejbal', 'Začátečníci', 'volejbal-letna',
      6, 1, 10, 0, 120, 6, 12, 0, NULL, NULL,
      'Hřiště Letná', 'Letohradská 1', '17000', 'Praha 7', 50.0961, 14.4258, 3
    ),
    (
      'deskovky-karlin', 'Deskovky v Karlíně',
      'Večer deskových her v herně Kostka. Od rychlých karetních her po strategie na tři hodiny, hry jsou na místě. Nováčkům rádi vysvětlíme pravidla.',
      NULL,
      'https://commons.wikimedia.org/wiki/Special:FilePath/Huge_Settlers_of_Catan_game_in_Petah_Tikva_05.jpg?width=800',
      'Deskové hry', 'Všechny úrovně', 'deskovkari-karlin',
      2, 1, 18, 30, 180, 3, 8, 1, 50, 'vstupné do herny',
      'Herna Kostka Karlín', 'Sokolovská 100', '18600', 'Praha 8', 50.0929, 14.4508, 5
    ),
    (
      'badminton-brevnov', 'Badminton ve Břevnově',
      'Máme zamluvené dva kurty na hodinu a půl. Hrajeme čtyřhru a po každém setu se střídáme.',
      'Sálová obuv. Rakety a míčky půjčíme.',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Badminton_players%2C_Y.M.C.A.%28I0009675%29.jpg?width=800',
      'Badminton', 'Mírně pokročilí', 'badminton-brevnov',
      5, 1, 17, 30, 90, 2, 4, 0, 120, 'za kurty a míčky',
      'Sportcentrum Břevnov', 'Bělohorská 80', '16900', 'Praha 6', 50.0869, 14.3685, 2
    ),
    (
      'mala-kopana', 'Malá kopaná na umělce',
      'Sedm na sedm na umělé trávě u Ďolíčku. Hrajeme naplno, ale fér. Většina týmu je domluvená, hledáme posily.',
      'Kopačky na umělou trávu nebo turfy, chrániče doporučujeme.',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Amateur_football_match_between_Wales_and_England_at_Porthmadog_%281496762%29.jpg?width=800',
      'Fotbal', 'Mírně pokročilí', NULL,
      3, 1, 19, 0, 90, 10, 14, 5, 100, NULL,
      'Umělka Ďolíček', 'Vršovická 31', '10100', 'Praha 10', 50.0669, 14.4578, 6
    ),
    (
      'sachy-kavarna', 'Šachový večer v kavárně',
      'Volné partie s hodinami 15+10 v kavárně Liberál. Šachovnice máme, káva je na každém.',
      NULL,
      'https://commons.wikimedia.org/wiki/Special:FilePath/The_Chess_Players_%28Dec_2022%29.jpg?width=800',
      'Šachy', 'Pokročilí', NULL,
      4, 2, 18, 0, 120, 2, 4, 2, NULL, NULL,
      'Kavárna Liberál', 'Heřmanova 6', '17000', 'Praha 7', 50.1003, 14.4337, 3
    ),
    (
      'beh-stromovka', 'Nedělní běh Stromovkou',
      'Klidné tempo kolem šesti minut na kilometr, okruh Stromovkou a zpět, zhruba 8 km. Nikoho nenecháváme za sebou.',
      'Běžecké boty, v chladnu čelenka.',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Running_through_Millennium_Park_%2819584952503%29.jpg?width=800',
      'Běh', 'Všechny úrovně', 'bezci-stromovka',
      7, 1, 9, 0, 75, 2, 20, 3, NULL, NULL,
      'Planetárium Praha', 'Královská obora 233', '17000', 'Praha 7', 50.1063, 14.4245, 5
    ),
    (
      'basket-ladvi', 'Basket pod Ládvím',
      'Streetball na venkovním hřišti, hrajeme tři na tři nebo pět na pět podle počtu. Zatím nás je málo, přidej se.',
      NULL,
      'https://commons.wikimedia.org/wiki/Special:FilePath/Basketball_Game_Warmup_Isla_Mujeres_2022.jpg?width=800',
      'Basketbal', 'Pokročilí', NULL,
      3, 2, 18, 0, 120, 6, 10, 0, NULL, NULL,
      'Hřiště Ládví', 'Burešova 1', '18200', 'Praha 8', 50.1273, 14.4680, 1
    ),
    (
      'stolni-tenis-vinohrady', 'Stolní tenis pro začátečníky',
      'Pinec v sokolovně na Vinohradech. Dva stoly, hrajeme na dva vítězné sety a střídáme se. Ideální na rozehrání po pauze.',
      'Pálku půjčíme, sálová obuv nutná.',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Table_tennis_at_the_2018_Summer_Youth_Olympics_%E2%80%93_Mixed_Bronze_Medal_Match_Women_021.jpg?width=800',
      'Stolní tenis', 'Začátečníci', NULL,
      2, 2, 17, 0, 120, 2, 4, 0, 60, 'za pronájem stolů',
      'Sokol Vinohrady', 'Polská 1a', '12000', 'Praha 2', 50.0786, 14.4433, 2
    ),
    (
      'cyklo-vltava', 'Cyklovýlet podél Vltavy',
      'Pohodový výlet z Náplavky po cyklostezce podél Vltavy a Berounky do Řevnic, kolem 30 km po rovině. Zpátky vlakem nebo po vlastní ose.',
      'Kolo v dobrém stavu, helma, svačina a jízdenka na vlak zpět.',
      'https://commons.wikimedia.org/wiki/Special:FilePath/2024_UCI_Para-cycling_Road_World_Championships_Zurich_Men_C1-2_R_14.jpg?width=800',
      'Cyklistika', 'Mírně pokročilí', NULL,
      6, 2, 9, 30, 300, 2, 15, 2, NULL, NULL,
      'Náplavka', 'Rašínovo nábřeží', '12800', 'Praha 2', 50.0718, 14.4141, 2
    ),
    (
      'joga-riegrovky', 'Jóga v Riegrových sadech',
      'Hodina jemné jógy pod širým nebem. Vede ji kamarádka, certifikovaná lektorka, a zvládnou to i úplní začátečníci.',
      'Podložka a teplejší vrstva.',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Outdoor_Yoga_At_the_Park.jpg?width=800',
      'Cvičení', 'Všechny úrovně', NULL,
      7, 1, 10, 30, 60, 3, 15, 0, 100, 'dobrovolný příspěvek lektorce',
      'Riegrovy sady', 'Riegrovy sady 28', '12000', 'Praha 2', 50.0794, 14.4425, 3
    ),
    (
      'plavani-podoli', 'Ranní plavání v Podolí',
      'Společné ranní plavání v padesátimetrovém bazénu. Každý plave svým tempem, potom zajdeme na snídani.',
      'Plavky, čepice a brýle.',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Swimming_Pool_lanes_and_starting_blocks.jpg?width=800',
      'Plavání', 'Všechny úrovně', NULL,
      3, 1, 7, 0, 60, 2, 10, 0, 180, 'vstupné do bazénu',
      'Plavecký stadion Podolí', 'Podolská 74', '14700', 'Praha 4', 50.0525, 14.4183, 1
    )
  ) AS v(
    slug, title, description, equipment, image_url,
    activity, level, group_slug,
    weekday, nth, hour, minute, duration, min, max, external, contribution, contribution_note,
    place_name, street, postal_code, district, latitude, longitude, age_days
  )
  CROSS JOIN demo_clock c
) AS r
JOIN "activity" a ON a."name" = r.activity
LEFT JOIN "level" l ON l."name" = r.level
LEFT JOIN "group" g ON g."id" = 'demo-group-' || r.group_slug
JOIN demo_people me ON me.who = 'me'
ON CONFLICT DO NOTHING;

-- Účasti: schválené žádosti a místa, která z nich vzešla. Žádali postupně po
-- vzniku akce, organizátor rozhodl do dvou hodin. Šachový večer je plný
-- (dvě místa jsou mimo aplikaci).

CREATE TEMP TABLE demo_seats AS
SELECT
  s.slug, s.who, e."id" AS event_id, p."id" AS user_id,
  e."createdAt" + make_interval(
    mins => 90 * row_number() OVER (PARTITION BY s.slug ORDER BY s.who)::int
  ) AS requested_at
FROM (VALUES
  ('florbal-kobylisy',       'paola'),
  ('florbal-kobylisy',       'x1'),
  ('florbal-kobylisy',       'x2'),
  ('florbal-kobylisy',       'x3'),
  ('florbal-kobylisy',       'x4'),
  ('florbal-kobylisy',       'x5'),
  ('volejbal-letna',         'paola'),
  ('volejbal-letna',         'krupickova'),
  ('volejbal-letna',         'x2'),
  ('volejbal-letna',         'x3'),
  ('deskovky-karlin',        'lebron'),
  ('deskovky-karlin',        'x1'),
  ('deskovky-karlin',        'x4'),
  ('badminton-brevnov',      'paola'),
  ('badminton-brevnov',      'x5'),
  ('mala-kopana',            'lebron'),
  ('mala-kopana',            'x1'),
  ('mala-kopana',            'x2'),
  ('mala-kopana',            'x3'),
  ('mala-kopana',            'x4'),
  ('mala-kopana',            'x5'),
  ('sachy-kavarna',          'paola'),
  ('sachy-kavarna',          'krupickova'),
  ('beh-stromovka',          'krupickova'),
  ('beh-stromovka',          'x2'),
  ('beh-stromovka',          'x5'),
  ('basket-ladvi',           'lebron'),
  ('basket-ladvi',           'x3'),
  ('basket-ladvi',           'x4'),
  ('stolni-tenis-vinohrady', 'lebron'),
  ('cyklo-vltava',           'paola'),
  ('cyklo-vltava',           'x1'),
  ('joga-riegrovky',         'krupickova'),
  ('joga-riegrovky',         'paola'),
  ('joga-riegrovky',         'x5')
) AS s(slug, who)
JOIN "event" e ON e."id" = 'demo-event-' || s.slug
JOIN demo_people p ON p.who = s.who;

INSERT INTO "participation_request" ("id", "status", "requestedAt", "decidedAt", "eventId", "userId")
SELECT
  'demo-request-' || s.slug || '-' || s.who,
  'APPROVED'::"request_status",
  s.requested_at, s.requested_at + interval '2 hours',
  s.event_id, s.user_id
FROM demo_seats s
ON CONFLICT DO NOTHING;

INSERT INTO "participation" ("id", "status", "eventId", "userId", "createdAt", "updatedAt")
SELECT
  'demo-participation-' || s.slug || '-' || s.who,
  'APPROVED'::"participation_status",
  s.event_id, s.user_id,
  s.requested_at + interval '2 hours', s.requested_at + interval '2 hours'
FROM demo_seats s
ON CONFLICT DO NOTHING;

-- Čekající žádosti o účast pro organizátora (F-05.7). Na každou akci jen od
-- lidí, kteří na ní nesedí; Lebron na florbale žádnou nemá, podá ji živě.

INSERT INTO "participation_request" ("id", "status", "message", "requestedAt", "eventId", "userId")
SELECT
  'demo-request-' || r.slug || '-' || r.who,
  'PENDING'::"request_status", r.message,
  c.utc_now - make_interval(hours => r.hours_ago),
  e."id", p."id"
FROM (VALUES
  ('florbal-kobylisy',  'krupickova', 'Ahoj, florbal hraju třetím rokem a hledám partu na čtvrtky. Hokejku mám vlastní.'::text, 3),
  ('badminton-brevnov', 'krupickova', 'Můžu se přidat? Hraju spíš rekreačně, ale čtyřhru zvládnu.', 26),
  ('deskovky-karlin',   'paola',      NULL, 5)
) AS r(slug, who, message, hours_ago)
JOIN "event" e ON e."id" = 'demo-event-' || r.slug
JOIN demo_people p ON p.who = r.who
CROSS JOIN demo_clock c
ON CONFLICT DO NOTHING;

DROP TABLE demo_seats, demo_clock, demo_people;

COMMIT;
