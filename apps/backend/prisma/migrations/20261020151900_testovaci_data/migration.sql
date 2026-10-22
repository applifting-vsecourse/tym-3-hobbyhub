-- Testovací obsah pro produkci (issue #120): osm akcí a tři skupiny, aby bylo
-- co předvádět a testovat. Produkce jen migruje, k databázi nemáme přístup,
-- proto data přicházejí migrací. Obsah je převzatý ze seedu
-- (src/scripts/seed/seed/seed-events.ts).
--
-- Lidé: všichni s rolí `user` v pořadí registrace. První organizuje akce
-- a zakládá skupiny, ostatní jsou účastníci a členové; kolik jich je, tolik
-- míst se obsadí. Bez uživatelů poddotaz nic nevrátí a nevloží se nic (CI,
-- čistá lokální databáze), číselníky z předchozí migrace zůstanou.
--
-- Id začínají `demo-`, aby šel obsah poznat a později smazat
-- (DELETE FROM "event" WHERE "id" LIKE 'demo-%' atd.). Akce, jejíž titulek už
-- existuje, se přeskočí (stejně jako v seedu), takže lokální databáze se
-- seedem nedostane duplicity. Termíny se počítají ode dne nasazení v čase
-- Europe/Prague a ukládají v UTC, jak je Prisma čte.

-- Akce ---------------------------------------------------------------------

WITH people AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS n
  FROM "user"
  WHERE "role" = 'user' AND "status" = 'ACTIVE'
), clock AS (
  SELECT
    (now() AT TIME ZONE 'UTC') AS utc_now,
    -- Local midnight in Prague, without a zone. The offset is added here, in
    -- local time, and only the result is converted to UTC, so "19:00" stays
    -- 19:00 on the other side of a daylight-saving change.
    date_trunc('day', now() AT TIME ZONE 'Europe/Prague') AS local_midnight
), rows AS (
  SELECT
    v.*,
    c.utc_now,
    ((c.local_midnight + make_interval(days => v.day_offset, hours => v.hour, mins => v.minute))
      AT TIME ZONE 'Europe/Prague') AT TIME ZONE 'UTC' AS start_at
  FROM (VALUES
    (
      'demo-event-ctvrtecni-florbal', 'Čtvrteční florbal',
      'Přátelský zápas v tělocvičně, hrajeme na dvě třetiny hřiště. Chybí nám pár lidí do minima.',
      'Hokejka a sálová obuv, dresy máme.'::text,
      'Florbal', 'Pokročilí', 1, 19, 0, 8, 10, 2, 80::numeric,
      'PUBLIC_VENUE'::"venue_type", NULL::text,
      'Chabařovická 1'::text, 'Praha'::text, '18200'::text, 'Praha 8'::text, 'ZŠ Kobylisy'::text, 50.1297::numeric, 14.4421::numeric,
      'PUBLISHED'::"event_status", NULL::text,
      'https://commons.wikimedia.org/wiki/Special:FilePath/V%C3%A4xj%C3%B6_-_UHC_floorball_face-off.jpg?width=800'
    ),
    (
      'demo-event-deskovky-v-herne', 'Deskovky v herně',
      'Večer deskových her, od lehkých po ty na tři hodiny. Hry máme.',
      NULL,
      'Deskové hry', 'Všechny úrovně', 1, 20, 0, 5, 8, 1, NULL,
      'PUBLIC_VENUE', NULL,
      'Sokolovská 100', 'Praha', '18600', 'Praha 8', 'Herna Kostka', 50.0952, 14.4486,
      'PUBLISHED', NULL,
      'https://commons.wikimedia.org/wiki/Special:FilePath/Huge_Settlers_of_Catan_game_in_Petah_Tikva_05.jpg?width=800'
    ),
    (
      'demo-event-volejbal-na-hristi', 'Volejbal na hřišti',
      'Smíšený volejbal pod širým nebem, začátečníci vítáni.',
      NULL,
      'Volejbal', 'Začátečníci', 2, 10, 0, 6, 12, 0, NULL,
      'PUBLIC_VENUE', NULL,
      'Letohradská 1', 'Praha', '17000', 'Praha 7', 'Hřiště Letná', 50.0961, 14.4258,
      'PUBLISHED', NULL,
      'https://commons.wikimedia.org/wiki/Special:FilePath/Volleyball_match_-_warming_up_2.jpg?width=800'
    ),
    (
      'demo-event-sachy-online', 'Šachy online',
      'Rychlé partie přes video hovor, odkaz uvidí schválení hráči.',
      NULL,
      'Šachy', 'Mírně pokročilí', 3, 18, 0, 2, 2, 0, NULL,
      'ONLINE', 'https://meet.example.com/sachy-pocitace',
      NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      'PUBLISHED', NULL,
      'https://commons.wikimedia.org/wiki/Special:FilePath/The_Chess_Players_%28Dec_2022%29.jpg?width=800'
    ),
    (
      'demo-event-patecni-badminton', 'Páteční badminton',
      'Dva kurty na hodinu a půl, hrajeme čtyřhru ve střídání.',
      'Rakety půjčíme, stačí sálová obuv.',
      'Badminton', 'Mírně pokročilí', 2, 17, 30, 2, 4, 2, 120,
      'PUBLIC_VENUE', NULL,
      'Bělohorská 80', 'Praha', '16900', 'Praha 6', 'Sportcentrum Břevnov', 50.0869, 14.3685,
      'PUBLISHED', NULL,
      'https://commons.wikimedia.org/wiki/Special:FilePath/Badminton_players%2C_Y.M.C.A.%28I0009675%29.jpg?width=800'
    ),
    (
      'demo-event-mala-kopana', 'Malá kopaná na umělce',
      'Sedm na sedm na umělé trávě, dresy máme.',
      NULL,
      'Fotbal', 'Mírně pokročilí', 7, 19, 0, 10, 14, 5, 100,
      'PUBLIC_VENUE', NULL,
      'Přístavní 3', 'Praha', '10000', 'Praha 10', 'Umělka Vršovice', 50.0645, 14.4571,
      'PUBLISHED', NULL,
      'https://commons.wikimedia.org/wiki/Special:FilePath/Amateur_football_match_between_Wales_and_England_at_Porthmadog_%281496762%29.jpg?width=800'
    ),
    -- Už proběhla: historie na stránce Moje akce.
    (
      'demo-event-vcerejsi-florbal', 'Včerejší florbal',
      'Přátelský zápas v tělocvičně, hrálo se na dvě třetiny hřiště. Díky všem, kdo dorazili.',
      'Hokejka a sálová obuv, dresy máme.',
      'Florbal', 'Pokročilí', -1, 19, 0, 8, 10, 0, NULL,
      'PUBLIC_VENUE', NULL,
      'Chabařovická 1', 'Praha', '18200', 'Praha 8', 'ZŠ Kobylisy', 50.1297, 14.4421,
      'FINISHED', NULL,
      'https://commons.wikimedia.org/wiki/Special:FilePath/V%C3%A4xj%C3%B6_-_UHC_floorball_face-off.jpg?width=800'
    ),
    -- Zrušená s důvodem.
    (
      'demo-event-zruseny-tenis', 'Zrušený tenisový turnaj',
      'Zrušeno pro nepříznivé počasí, náhradní termín vypíšeme.',
      NULL,
      'Tenis', 'Pokročilí', 3, 10, 0, 2, 4, 0, NULL,
      'PUBLIC_VENUE', NULL,
      'Ovenecká 1', 'Praha', '17000', 'Praha 7', 'Tenisové kurty Letná', 50.0985, 14.4262,
      'CANCELLED', 'Nepříznivé počasí',
      'https://commons.wikimedia.org/wiki/Special:FilePath/141100_-_Wheelchair_tennis_David_Hall_serves_2_-_3b_-_2000_Sydney_match_photo.jpg?width=800'
    )
  ) AS v(
    id, title, description, equipment,
    activity, level, day_offset, hour, minute, min, max, external, contribution,
    venue_type, online_url,
    street, city, postal_code, district, place_name, latitude, longitude,
    status, reason, image_url
  )
  CROSS JOIN clock c
)
INSERT INTO "event" (
  "id", "title", "description", "equipment", "imageUrl",
  "status", "visibility", "approvalMode", "venueType",
  "startAt", "endAt", "publishedAt", "cancelledAt", "cancellationReasonId",
  "minParticipants", "maxParticipants", "externalOccupiedSpots",
  "fillDeadlineHours", "freeCancellationHours", "contributionAmount", "onlineUrl",
  "locationStreet", "locationCity", "locationPostalCode", "locationCountry",
  "locationDistrict", "locationPlaceName", "locationLatitude", "locationLongitude",
  "activityId", "levelId", "organizerId", "createdAt", "updatedAt"
)
SELECT
  r.id, r.title, r.description, r.equipment, r.image_url,
  r.status, 'PUBLIC'::"event_visibility", 'MANUAL'::"approval_mode", r.venue_type,
  r.start_at, r.start_at + interval '2 hours',
  LEAST(r.utc_now, r.start_at - interval '1 day'),
  CASE WHEN r.status = 'CANCELLED' THEN r.utc_now END,
  (SELECT cr."id" FROM "cancellation_reason" cr WHERE cr."name" = r.reason),
  r.min, r.max, r.external,
  3, 12, r.contribution, r.online_url,
  r.street, r.city, r.postal_code, CASE WHEN r.street IS NULL THEN NULL ELSE 'Česko' END,
  r.district, r.place_name, r.latitude, r.longitude,
  (SELECT a."id" FROM "activity" a WHERE a."name" = r.activity),
  (SELECT l."id" FROM "level" l WHERE l."name" = r.level),
  p."id", r.utc_now, r.utc_now
FROM rows r
JOIN people p ON p.n = 1
WHERE NOT EXISTS (SELECT 1 FROM "event" e WHERE e."title" = r.title)
ON CONFLICT ("id") DO NOTHING;

-- Účasti: organizátor je na své akci hned (Event.joinAsOrganizer), ostatní
-- podle pořadí registrace. Rozsah n_from–n_to říká, kolikátí uživatelé sedí;
-- kdo neexistuje, místo nechá volné. Na akci, která se výše přeskočila,
-- se nic nenavěsí.

WITH people AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS n
  FROM "user"
  WHERE "role" = 'user' AND "status" = 'ACTIVE'
), clock AS (
  SELECT (now() AT TIME ZONE 'UTC') AS utc_now
), seats AS (
  SELECT * FROM (VALUES
    ('demo-event-ctvrtecni-florbal',  1, 1, 'APPROVED'::"participation_status"),
    ('demo-event-ctvrtecni-florbal',  2, 5, 'APPROVED'),
    ('demo-event-deskovky-v-herne',   1, 1, 'APPROVED'),
    ('demo-event-deskovky-v-herne',   2, 3, 'APPROVED'),
    ('demo-event-volejbal-na-hristi', 1, 1, 'APPROVED'),
    ('demo-event-volejbal-na-hristi', 2, 4, 'APPROVED'),
    ('demo-event-volejbal-na-hristi', 5, 5, 'WAITLISTED'),
    ('demo-event-sachy-online',       1, 1, 'APPROVED'),
    ('demo-event-patecni-badminton',  1, 1, 'APPROVED'),
    ('demo-event-patecni-badminton',  2, 2, 'APPROVED'),
    ('demo-event-mala-kopana',        1, 1, 'APPROVED'),
    ('demo-event-mala-kopana',        2, 5, 'APPROVED'),
    ('demo-event-vcerejsi-florbal',   1, 1, 'ATTENDED'),
    ('demo-event-vcerejsi-florbal',   2, 4, 'ATTENDED'),
    ('demo-event-zruseny-tenis',      1, 1, 'APPROVED')
  ) AS s(event_id, n_from, n_to, status)
)
INSERT INTO "participation" (
  "id", "status", "waitlistPosition", "confirmedAt",
  "eventId", "userId", "createdAt", "updatedAt"
)
SELECT
  'demo-participation-' || substr(s.event_id, length('demo-event-') + 1) || '-' || p.n,
  s.status,
  CASE WHEN s.status = 'WAITLISTED' THEN p.n - s.n_from + 1 END,
  CASE WHEN s.status IN ('APPROVED', 'ATTENDED') THEN c.utc_now END,
  e."id", p."id", c.utc_now, c.utc_now
FROM seats s
JOIN "event" e ON e."id" = s.event_id
JOIN people p ON p.n BETWEEN s.n_from AND s.n_to
CROSS JOIN clock c
ON CONFLICT DO NOTHING;

-- Skupiny ------------------------------------------------------------------

WITH people AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS n
  FROM "user"
  WHERE "role" = 'user' AND "status" = 'ACTIVE'
), clock AS (
  SELECT (now() AT TIME ZONE 'UTC') AS utc_now
)
INSERT INTO "group" (
  "id", "name", "description", "locationName", "usualSchedule",
  "visibility", "status", "activityId", "createdAt", "updatedAt"
)
SELECT
  g.id, g.name, g.description, g.location_name, g.usual_schedule,
  'PUBLIC'::"group_visibility", 'ACTIVE'::"group_status",
  (SELECT a."id" FROM "activity" a WHERE a."name" = g.activity),
  c.utc_now, c.utc_now
FROM (VALUES
  (
    'demo-group-florbal-kobylisy', 'Florbal Kobylisy',
    'Scházíme se každý čtvrtek v tělocvičně ZŠ Kobylisy. Hrajeme pro radost, ale rádi vyhráváme.',
    'Florbal', 'Praha 8', 'Čtvrtek 19:00'
  ),
  (
    'demo-group-deskovkari', 'Deskovkáři z Karlína',
    'Deskové hry od lehkých po těžké strategie. Hry máme, stačí přijít.',
    'Deskové hry', 'Praha 8', 'Úterý a pátek večer'
  ),
  (
    'demo-group-volejbal-letna', 'Volejbal na Letné',
    'Smíšený volejbal pod širým nebem, začátečníci vítáni.',
    'Volejbal', 'Praha 7', 'Víkendové dopoledne'
  )
) AS g(id, name, description, activity, location_name, usual_schedule)
JOIN people p ON p.n = 1
CROSS JOIN clock c
ON CONFLICT ("id") DO NOTHING;

-- Členství: první uživatel je zakladatel (právě jeden OWNER, viz partial
-- unique index v migraci `group`), ostatní členové podle rozsahu.

WITH people AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS n
  FROM "user"
  WHERE "role" = 'user' AND "status" = 'ACTIVE'
), clock AS (
  SELECT (now() AT TIME ZONE 'UTC') AS utc_now
), seats AS (
  SELECT * FROM (VALUES
    ('demo-group-florbal-kobylisy', 1, 1,       'OWNER'::"group_role"),
    ('demo-group-florbal-kobylisy', 2, 1000000, 'MEMBER'),
    ('demo-group-deskovkari',       1, 1,       'OWNER'),
    ('demo-group-deskovkari',       2, 3,       'MEMBER'),
    ('demo-group-volejbal-letna',   1, 1,       'OWNER'),
    ('demo-group-volejbal-letna',   3, 5,       'MEMBER')
  ) AS s(group_id, n_from, n_to, role)
)
INSERT INTO "group_membership" ("id", "role", "joinedAt", "groupId", "userId")
SELECT
  'demo-membership-' || substr(s.group_id, length('demo-group-') + 1) || '-' || p.n,
  s.role, c.utc_now, g."id", p."id"
FROM seats s
JOIN "group" g ON g."id" = s.group_id
JOIN people p ON p.n BETWEEN s.n_from AND s.n_to
CROSS JOIN clock c
ON CONFLICT DO NOTHING;
