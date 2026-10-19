-- AlterTable
ALTER TABLE "event" ADD COLUMN     "contributionNote" VARCHAR(200),
ALTER COLUMN "fillDeadlineHours" DROP NOT NULL;


-- Not expressible in Prisma (see the note at the top of schema.prisma).

-- F-05.1 enters a structured address without a map, so the coordinates are no
-- longer part of the all-or-nothing rule: an address is street, city, postal
-- code and country, or nothing at all (then no coordinates, district or place
-- name either). Coordinates come with geocoding (F-12.3).
ALTER TABLE "event" DROP CONSTRAINT "event_location_all_or_nothing";
ALTER TABLE "event" ADD CONSTRAINT "event_location_all_or_nothing" CHECK (
  ("locationStreet" IS NOT NULL AND "locationCity" IS NOT NULL AND "locationPostalCode" IS NOT NULL
    AND "locationCountry" IS NOT NULL)
  OR
  ("locationStreet" IS NULL AND "locationCity" IS NULL AND "locationPostalCode" IS NULL
    AND "locationCountry" IS NULL AND "locationLatitude" IS NULL AND "locationLongitude" IS NULL
    AND "locationDistrict" IS NULL AND "locationPlaceName" IS NULL)
);
-- Coordinates still come in pairs.
ALTER TABLE "event" ADD CONSTRAINT "event_coordinates_together" CHECK (
  ("locationLatitude" IS NULL) = ("locationLongitude" IS NULL)
);

-- Same limits as the API: title 3–80 characters, description not blank, the
-- contribution is an amount of money and a note makes sense only with it.
ALTER TABLE "event" ADD CONSTRAINT "event_title_length" CHECK (char_length(btrim("title")) BETWEEN 3 AND 80);
ALTER TABLE "event" ADD CONSTRAINT "event_description_not_blank" CHECK (btrim("description") <> '');
ALTER TABLE "event" ADD CONSTRAINT "event_contribution_non_negative" CHECK ("contributionAmount" IS NULL OR "contributionAmount" >= 0);
ALTER TABLE "event" ADD CONSTRAINT "event_contribution_note_with_amount" CHECK ("contributionNote" IS NULL OR "contributionAmount" IS NOT NULL);
