-- F-02.5: na produkci nemá žádná akce skupinu, protože seed tam neběží a demo
-- data přicházejí migrací `testovaci_data`. Bez toho by tam nikdo neviděl
-- „Pořádá skupina X“. Čtvrteční florbal tedy pořádá Florbal Kobylisy.
--
-- Bez demo dat (CI, čistá lokální databáze) nic nenajde a nic se nezmění;
-- skupina, kterou už akce má, se nepřepisuje.
UPDATE "event"
SET "groupId" = 'demo-group-florbal-kobylisy'
WHERE "id" = 'demo-event-ctvrtecni-florbal'
  AND "groupId" IS NULL
  AND EXISTS (SELECT 1 FROM "group" WHERE "id" = 'demo-group-florbal-kobylisy');
