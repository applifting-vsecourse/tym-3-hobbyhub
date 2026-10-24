-- Poloha akce: souřadnice leží na zeměkouli. Dvojice (obě, nebo žádná) už hlídá
-- event_coordinates_together; sloupec DECIMAL(9,6) sám by pustil i 150 stupňů.
ALTER TABLE "event" ADD CONSTRAINT "event_coordinates_range" CHECK (
  "locationLatitude" IS NULL
  OR ("locationLatitude" BETWEEN -90 AND 90 AND "locationLongitude" BETWEEN -180 AND 180)
);
