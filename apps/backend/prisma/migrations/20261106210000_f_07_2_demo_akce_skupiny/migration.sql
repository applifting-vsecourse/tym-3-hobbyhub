-- F-07.2: detail skupiny pro člena ukazuje nadcházející a minulé akce skupiny,
-- i ty jen pro skupinu. Vytvořit akci pro skupinu zatím nejde (F-07.5 #50),
-- takže by výpis na produkci byl skoro prázdný. Skupině Florbal Kobylisy proto
-- přidáme čtyři demo akce: nadcházející jen pro skupinu, nadcházející zrušenou
-- a dvě minulé (jednu veřejnou, jednu jen pro skupinu).
--
-- Organizuje je stejně jako ostatní demo akce kruj08@vse.cz (vlastník
-- skupiny). Bez té skupiny nebo toho účtu (CI, čistá lokální databáze) se nic
-- nevloží; id s prefixem `demo-` nechávají akce poznat a smazat jako zbytek
-- demo dat, a ON CONFLICT je při opakování přeskočí.
--
-- Termíny se počítají ode dne nasazení v čase Europe/Prague a ukládají v UTC,
-- jak je Prisma čte. Místa mimo aplikaci (`externalOccupiedSpots`) dávají
-- minulým akcím obsazenost bez vymyšlených účastí.

INSERT INTO "event" (
  "id", "title", "description", "equipment",
  "status", "visibility", "approvalMode", "venueType",
  "startAt", "endAt", "publishedAt", "cancelledAt", "cancellationReasonId",
  "minParticipants", "maxParticipants", "externalOccupiedSpots",
  "locationStreet", "locationCity", "locationPostalCode", "locationCountry",
  "locationDistrict", "locationPlaceName", "locationLatitude", "locationLongitude",
  "activityId", "levelId", "organizerId", "groupId", "createdAt", "updatedAt"
)
SELECT
  'demo-event-' || r.slug, r.title, r.description,
  'Hokejka a sálová obuv. Dresy obou barev máme.',
  r.status::"event_status", r.visibility::"event_visibility",
  'MANUAL'::"approval_mode", 'PUBLIC_VENUE'::"venue_type",
  r.start_at, r.start_at + interval '2 hours',
  r.start_at - interval '10 days',
  CASE WHEN r.status = 'CANCELLED' THEN now() AT TIME ZONE 'UTC' END,
  CASE WHEN r.status = 'CANCELLED' THEN cr."id" END,
  8, 12, r.external,
  'Chabařovická 1', 'Praha', '18200', 'Česko',
  'Praha 8', 'ZŠ Kobylisy', 50.1297, 14.4421,
  a."id", l."id", u."id", g."id",
  r.start_at - interval '10 days', r.start_at - interval '10 days'
FROM (
  SELECT
    v.*,
    ((date_trunc('day', now() AT TIME ZONE 'Europe/Prague')
        + make_interval(days => v.day_offset, hours => 19))
      AT TIME ZONE 'Europe/Prague') AT TIME ZONE 'UTC' AS start_at
  FROM (VALUES
    (
      'florbal-kobylisy-trenink', 'Trénink jen pro členy',
      'Trénink pro členy skupiny: nacvičíme přesilovky a rozehrávku od brankáře, na konci zápas. Kdo nemá hokejku, půjčíme.',
      'PUBLISHED', 'GROUP_ONLY', 5, 0
    ),
    (
      'florbal-kobylisy-turnaj', 'Florbalový turnaj o pohár Kobylis',
      'Turnaj čtyř týmů v tělocvičně ZŠ Kobylisy. Tělocvična je ten den zavřená kvůli opravě, turnaj proto rušíme.',
      'CANCELLED', 'PUBLIC', 12, 0
    ),
    (
      'florbal-kobylisy-minuly', 'Florbal v Kobylisích',
      'Florbal v tělocvičně ZŠ Kobylisy. Hráli jsme na dvě třetiny hřiště a střídali se po pěti minutách.',
      'PUBLISHED', 'PUBLIC', -7, 10
    ),
    (
      'florbal-kobylisy-trenink-minuly', 'Trénink jen pro členy',
      'Trénink pro členy skupiny: střelba z první a obranné postavení.',
      'PUBLISHED', 'GROUP_ONLY', -14, 9
    )
  ) AS v(slug, title, description, status, visibility, day_offset, external)
) AS r
JOIN "group" g ON g."id" = 'demo-group-florbal-kobylisy'
JOIN "user" u ON lower(u."email") = 'kruj08@vse.cz'
JOIN "activity" a ON a."name" = 'Florbal'
LEFT JOIN "level" l ON l."name" = 'Mírně pokročilí'
LEFT JOIN "cancellation_reason" cr ON cr."name" = 'Nedostupné místo'
ON CONFLICT DO NOTHING;
