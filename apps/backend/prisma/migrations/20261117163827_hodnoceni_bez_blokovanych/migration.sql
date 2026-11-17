-- #236, ADR-0022, ADR-0027 (review PR #264): hodnocení mezi dvojicí, která je
-- zablokovaná, se nepočítá nikde. Ani v počtu, průměru a rozložení hvězdiček
-- hodnoceného, ani ve veřejném skóre a ve skóre akce. Jinak by z rozdílu mezi
-- seznamem „Moje hodnocení“ (blokovaný autor v něm není) a čísly šlo poznat,
-- že blokace existuje, a to ADR-0022 nedovoluje. Platí pro blokaci v obou
-- směrech; hodnocení zůstává uložené a po zrušení blokace se znovu započítá.
-- Podmínka odkrytí se nemění; `user_rating_score` a `event_rating_score` čtou
-- z tohoto view, takže se upraví samy.
CREATE OR REPLACE VIEW "rating_revealed" AS
SELECT r.*
FROM "rating" r
JOIN "event" e ON e."id" = r."eventId"
WHERE e."endAt" + INTERVAL '7 days' < (now() AT TIME ZONE 'UTC')
  AND e."status" IN ('PUBLISHED', 'FINISHED')
  AND NOT e."isHidden"
  AND NOT EXISTS (
    SELECT 1
    FROM "user_block" b
    WHERE (b."blockerId" = r."authorId" AND b."blockedId" = r."ratedUserId")
       OR (b."blockerId" = r."ratedUserId" AND b."blockedId" = r."authorId")
  );
