-- #218, ADR-0029: the organizer no longer picks a type of place (public venue
-- or private premises). They choose whether the exact address is public; a
-- venue is a place or online. A public venue keeps its pin and name and now
-- shows its street to everyone; private premises stay hidden until approval.

ALTER TABLE "event" ADD COLUMN "isAddressPublic" BOOLEAN NOT NULL DEFAULT false;
UPDATE "event" SET "isAddressPublic" = true WHERE "venueType" = 'PUBLIC_VENUE';

-- The CHECKs on the venue type are dropped while its enum changes, then put back.
ALTER TABLE "event" DROP CONSTRAINT "event_online_has_no_location";
ALTER TABLE "event" DROP CONSTRAINT "event_online_url_only_online";

ALTER TYPE "venue_type" RENAME TO "venue_type_old";
CREATE TYPE "venue_type" AS ENUM ('PLACE', 'ONLINE');
ALTER TABLE "event"
  ALTER COLUMN "venueType" TYPE "venue_type"
  USING (CASE WHEN "venueType"::text = 'ONLINE' THEN 'ONLINE' ELSE 'PLACE' END)::"venue_type";
DROP TYPE "venue_type_old";

ALTER TABLE "event" ADD CONSTRAINT "event_online_has_no_location"
  CHECK ("venueType" <> 'ONLINE' OR "locationCity" IS NULL);
ALTER TABLE "event" ADD CONSTRAINT "event_online_url_only_online"
  CHECK ("onlineUrl" IS NULL OR "venueType" = 'ONLINE');

-- An online event has no address to make public.
ALTER TABLE "event" ADD CONSTRAINT "event_online_address_not_public"
  CHECK ("venueType" <> 'ONLINE' OR NOT "isAddressPublic");
