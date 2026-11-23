-- #218, ADR-0029: migrace 20261120230000_f_218_viditelnost_adresy nechala
-- u všech stávajících akcí adresu skrytou, aby se nezveřejnila žádná adresa,
-- kterou organizátor zadával s tím, že ji uvidí jen schválení účastníci.
-- Na produkci jsou ale zatím jen demo akce z migrací s testovacími daty
-- (20261020151900_testovaci_data, 20261026115157_testovaci_data_sprint_review_2,
-- 20261106210000_f_07_2_demo_akce_skupiny), a ty by tím zmizely z mapy.
--
-- Demo akce jsou všechny na veřejném místě (sportoviště, herna), takže jim
-- adresu zveřejníme, stejně jako to dělá seed. Týká se jen akcí s id
-- `demo-`; akcí, které založili skuteční organizátoři, se migrace nedotkne.
-- Online akce adresu nemají (CHECK event_online_address_not_public).
-- Bez demo akcí (CI, čistá lokální databáze) nezmění nic.

UPDATE "event"
SET "isAddressPublic" = true
WHERE "id" LIKE 'demo-%'
  AND "venueType" = 'PLACE'
  AND NOT "isAddressPublic";
