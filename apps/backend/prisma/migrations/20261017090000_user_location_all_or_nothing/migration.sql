-- User: domovská i dočasná adresa je buď celá (povinné části), nebo žádná (jako u Event).
-- Zbývající CHECK omezení jsou v migraci akce_schema.
ALTER TABLE "user" ADD CONSTRAINT "user_home_location_all_or_nothing" CHECK (
  ("homeStreet" IS NOT NULL AND "homeCity" IS NOT NULL AND "homePostalCode" IS NOT NULL AND "homeCountry" IS NOT NULL AND "homeLatitude" IS NOT NULL AND "homeLongitude" IS NOT NULL)
  OR
  ("homeStreet" IS NULL AND "homeCity" IS NULL AND "homePostalCode" IS NULL AND "homeCountry" IS NULL AND "homeLatitude" IS NULL AND "homeLongitude" IS NULL AND "homeDistrict" IS NULL AND "homePlaceName" IS NULL)
);
ALTER TABLE "user" ADD CONSTRAINT "user_temporary_location_all_or_nothing" CHECK (
  ("temporaryStreet" IS NOT NULL AND "temporaryCity" IS NOT NULL AND "temporaryPostalCode" IS NOT NULL AND "temporaryCountry" IS NOT NULL AND "temporaryLatitude" IS NOT NULL AND "temporaryLongitude" IS NOT NULL)
  OR
  ("temporaryStreet" IS NULL AND "temporaryCity" IS NULL AND "temporaryPostalCode" IS NULL AND "temporaryCountry" IS NULL AND "temporaryLatitude" IS NULL AND "temporaryLongitude" IS NULL AND "temporaryDistrict" IS NULL AND "temporaryPlaceName" IS NULL)
);
